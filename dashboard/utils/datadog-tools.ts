import { tool } from "ai";
import { z } from "zod";
import {
  searchSpans,
  aggregateSpans,
  getTraceSpans,
} from "@/utils/datadog/spans";

function logToolCall(
  toolName: string,
  params: unknown,
  result: unknown,
  durationMs: number
) {
  const summary =
    result && typeof result === "object"
      ? Object.fromEntries(
          Object.entries(result as Record<string, unknown>).map(([k, v]) => [
            k,
            Array.isArray(v) ? `[${v.length} items]` : typeof v,
          ])
        )
      : typeof result;
  console.log(
    `[datadog-tool] ${toolName} completed in ${durationMs}ms | params: ${JSON.stringify(params)} | result shape: ${JSON.stringify(summary)}`
  );
}

function logToolError(toolName: string, params: unknown, error: unknown) {
  console.error(
    `[datadog-tool] ${toolName} FAILED | params: ${JSON.stringify(params)} | error: ${error instanceof Error ? error.message : String(error)}`
  );
}

export function createDatadogTools() {
  return {
    search_datadog_spans: tool({
      description:
        "Search Datadog APM spans by service, status, time range, and other filters. Use Datadog query syntax (e.g. service:conversational-ai status:error @http.status_code:500). Use this for finding specific errors, slow requests, or investigating request patterns.",
      inputSchema: z.object({
        query: z
          .string()
          .describe(
            'Datadog span search query, e.g. "service:conversational-ai status:error"'
          ),
        from: z
          .string()
          .describe(
            'Start time — ISO 8601 or relative like "now-1h"'
          ),
        to: z
          .string()
          .describe(
            'End time — ISO 8601 or relative like "now"'
          ),
        sort: z
          .enum(["timestamp", "-timestamp"])
          .optional()
          .describe(
            'Sort order: "timestamp" (oldest first) or "-timestamp" (newest first, default)'
          ),
        limit: z
          .number()
          .optional()
          .describe("Max spans to return (default 50)"),
        cursor: z
          .string()
          .optional()
          .describe("Pagination cursor from previous response"),
      }),
      execute: async (params) => {
        const start = Date.now();
        try {
          const result = await searchSpans(params);
          logToolCall("search_datadog_spans", params, result, Date.now() - start);
          return result;
        } catch (error) {
          logToolError("search_datadog_spans", params, error);
          throw error;
        }
      },
    }),

    aggregate_datadog_spans: tool({
      description:
        "Aggregate Datadog APM spans to compute metrics like error counts, p95/p99 latency, throughput, grouped by resource, status, or other facets. Use this for high-level analysis: error rates, latency percentiles, and identifying which endpoints or services are degraded.",
      inputSchema: z.object({
        query: z
          .string()
          .describe(
            'Datadog span search query, e.g. "service:conversational-ai"'
          ),
        from: z
          .string()
          .describe(
            'Start time — ISO 8601 or relative like "now-1h"'
          ),
        to: z
          .string()
          .describe(
            'End time — ISO 8601 or relative like "now"'
          ),
        compute: z
          .array(
            z.object({
              aggregation: z
                .string()
                .describe(
                  'Aggregation function: count, avg, sum, min, max, pc75, pc90, pc95, pc99, median, cardinality'
                ),
              metric: z
                .string()
                .optional()
                .describe(
                  'Metric to aggregate on (e.g. "duration" for latency). Required for all aggregations except count.'
                ),
              type: z
                .enum(["total", "timeseries"])
                .optional()
                .describe(
                  '"total" for a single value, "timeseries" for bucketed over time'
                ),
              interval: z
                .string()
                .optional()
                .describe(
                  'Bucket interval for timeseries (e.g. "5m", "1h")'
                ),
            })
          )
          .describe("List of computations to perform"),
        groupBy: z
          .array(
            z.object({
              facet: z
                .string()
                .describe(
                  'Facet to group by (e.g. "resource_name", "status", "@http.status_code")'
                ),
              limit: z
                .number()
                .optional()
                .describe("Max groups for this facet (default 10)"),
              sort: z
                .object({
                  metric: z.string().optional(),
                  order: z.enum(["asc", "desc"]).optional(),
                })
                .optional()
                .describe("Sort order for groups"),
            })
          )
          .optional()
          .describe("Optional grouping dimensions"),
      }),
      execute: async (params) => {
        const start = Date.now();
        try {
          const result = await aggregateSpans(params);
          logToolCall(
            "aggregate_datadog_spans",
            params,
            result,
            Date.now() - start
          );
          return result;
        } catch (error) {
          logToolError("aggregate_datadog_spans", params, error);
          throw error;
        }
      },
    }),

    get_datadog_trace: tool({
      description:
        "Get all spans for a specific Datadog trace ID. Returns the full distributed trace with all spans sorted chronologically, showing the request flow across services. Use this to drill into a specific request after finding it via search or when the user provides a trace ID.",
      inputSchema: z.object({
        traceId: z.string().describe("The Datadog trace ID to look up"),
      }),
      execute: async (params) => {
        const start = Date.now();
        try {
          const result = await getTraceSpans(params.traceId);
          logToolCall("get_datadog_trace", params, result, Date.now() - start);
          return result;
        } catch (error) {
          logToolError("get_datadog_trace", params, error);
          throw error;
        }
      },
    }),
  };
}
