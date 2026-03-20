import { NextResponse } from "next/server";
import { loadMemory } from "@/utils/memory/storage";
import { callMcpTool } from "@/utils/mcp-tools";
import type { DataPoint, ServiceMetrics, MetricsResponse } from "@/types/metrics";

const DEFAULT_PROJECT = "alg-ai-platform-staging";
const NAMESPACE = "generativeai";

function getAlignmentPeriod(startTime: string, endTime: string): string {
  const hours =
    (new Date(endTime).getTime() - new Date(startTime).getTime()) / 3_600_000;
  if (hours <= 1) return "60s";
  if (hours <= 6) return "300s";
  if (hours <= 24) return "600s";
  return "3600s";
}

function buildFilter(metricType: string, service: string, extra?: string): string {
  let f = `metric.type = "${metricType}" AND resource.type = "k8s_container" AND resource.labels.namespace_name = "${NAMESPACE}" AND resource.labels.pod_name = starts_with("${service}")`;
  if (extra) f += ` AND ${extra}`;
  return f;
}

/**
 * Extract the JSON text from an MCP CallToolResult.
 * The execute() function returns { content: [{ type: "text", text: "..." }] }
 */
function extractMcpText(raw: unknown): string | null {
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object" && "content" in raw) {
    const content = (raw as { content: unknown[] }).content;
    if (Array.isArray(content)) {
      const text = content.find(
        (c): c is { type: string; text: string } =>
          typeof c === "object" && c !== null && (c as Record<string, unknown>).type === "text"
      );
      if (text) return text.text;
    }
  }
  return null;
}

function parseTimeSeries(
  raw: unknown,
  aggregation: "sum" | "mean" | "max"
): DataPoint[] {
  let timeSeries: unknown[];
  try {
    const text = extractMcpText(raw);
    if (text) {
      const parsed = JSON.parse(text);
      timeSeries = Array.isArray(parsed) ? parsed : parsed.timeSeries ?? [];
    } else if (Array.isArray(raw)) {
      timeSeries = raw;
    } else {
      return [];
    }
  } catch {
    return [];
  }

  if (timeSeries.length === 0) return [];

  // Group all points by timestamp across all time series
  const byTime = new Map<string, number[]>();

  for (const series of timeSeries) {
    const points = (series as Record<string, unknown>).points;
    if (!Array.isArray(points)) continue;

    for (const point of points) {
      const p = point as Record<string, unknown>;
      const interval = p.interval as Record<string, string> | undefined;
      const ts = interval?.endTime;
      if (!ts) continue;

      const val = p.value as Record<string, unknown> | undefined;
      const value =
        (val?.doubleValue as number) ??
        Number(val?.int64Value ?? 0);

      if (!byTime.has(ts)) byTime.set(ts, []);
      byTime.get(ts)!.push(value);
    }
  }

  return Array.from(byTime.entries())
    .map(([ts, values]) => {
      const agg =
        aggregation === "sum"
          ? values.reduce((a, b) => a + b, 0)
          : aggregation === "mean"
            ? values.reduce((a, b) => a + b, 0) / values.length
            : Math.max(...values);
      return {
        timestamp: ts,
        time: ts.slice(11, 16),
        value: agg,
      };
    })
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

async function fetchMetric(
  project: string,
  filter: string,
  startTime: string,
  endTime: string,
  aligner: string,
  alignmentPeriod: string
): Promise<unknown> {
  return callMcpTool("list_time_series", {
    name: `projects/${project}`,
    filter,
    interval: { startTime, endTime },
    aggregation: { alignmentPeriod, perSeriesAligner: aligner },
    pageSize: 500,
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ incidentId: string }> }
) {
  const { incidentId } = await params;
  const memory = await loadMemory(incidentId);

  if (!memory) {
    return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  }

  const services = memory.metadata.affected_services;
  if (!services || services.length === 0) {
    return NextResponse.json({} as MetricsResponse);
  }

  const project = memory.metadata.gcp_project || DEFAULT_PROJECT;
  const endTime = new Date().toISOString();

  // Ensure at least 1 hour of data
  const incidentStart = new Date(memory.metadata.started_at);
  const oneHourAgo = new Date(Date.now() - 3_600_000);
  const startTime = (
    incidentStart > oneHourAgo ? oneHourAgo : incidentStart
  ).toISOString();

  const alignmentPeriod = getAlignmentPeriod(startTime, endTime);

  const result: MetricsResponse = {};

  // Fetch metrics for all services in parallel
  await Promise.all(
    services.map(async (service) => {
      const queries = [
        // CPU utilization (% of limit)
        fetchMetric(
          project,
          buildFilter("kubernetes.io/container/cpu/limit_utilization", service),
          startTime,
          endTime,
          "ALIGN_MEAN",
          alignmentPeriod
        ),
        // CPU core usage (actual cores consumed — shows load spikes)
        fetchMetric(
          project,
          buildFilter("kubernetes.io/container/cpu/core_usage_time", service),
          startTime,
          endTime,
          "ALIGN_RATE",
          alignmentPeriod
        ),
        // Memory utilization (% of limit, non-evictable)
        fetchMetric(
          project,
          buildFilter(
            "kubernetes.io/container/memory/limit_utilization",
            service,
            'metric.labels.memory_type = "non-evictable"'
          ),
          startTime,
          endTime,
          "ALIGN_MEAN",
          alignmentPeriod
        ),
        // Memory used (bytes, non-evictable — shows leak patterns)
        fetchMetric(
          project,
          buildFilter(
            "kubernetes.io/container/memory/used_bytes",
            service,
            'metric.labels.memory_type = "non-evictable"'
          ),
          startTime,
          endTime,
          "ALIGN_MEAN",
          alignmentPeriod
        ),
        // Pod restarts (delta — stability signal)
        fetchMetric(
          project,
          buildFilter("kubernetes.io/container/restart_count", service),
          startTime,
          endTime,
          "ALIGN_DELTA",
          alignmentPeriod
        ),
        // Uptime (seconds — drops reveal restarts)
        fetchMetric(
          project,
          buildFilter("kubernetes.io/container/uptime", service),
          startTime,
          endTime,
          "ALIGN_MEAN",
          alignmentPeriod
        ),
      ];

      const results = await Promise.allSettled(queries);

      const extract = (r: PromiseSettledResult<unknown>) =>
        r.status === "fulfilled" ? r.value : null;

      const metrics: ServiceMetrics = {
        cpuUtilization: parseTimeSeries(extract(results[0]), "mean"),
        cpuCores: parseTimeSeries(extract(results[1]), "sum"),
        memoryUtilization: parseTimeSeries(extract(results[2]), "mean"),
        memoryUsed: parseTimeSeries(extract(results[3]), "sum"),
        podRestarts: parseTimeSeries(extract(results[4]), "sum"),
        uptime: parseTimeSeries(extract(results[5]), "mean"),
      };

      result[service] = metrics;
    })
  );

  return NextResponse.json(result);
}
