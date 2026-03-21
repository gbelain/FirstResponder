import { v2 } from "@datadog/datadog-api-client";
import { getSpansApi } from "./client";
import type {
  SpanSummary,
  SearchSpansResult,
  AggregateSpansResult,
} from "./types";

function mapSpan(span: v2.Span): SpanSummary {
  const attrs = span.attributes;
  const startMs = attrs?.startTimestamp
    ? new Date(attrs.startTimestamp).getTime()
    : undefined;
  const endMs = attrs?.endTimestamp
    ? new Date(attrs.endTimestamp).getTime()
    : undefined;

  // Cap meta to first 20 keys
  let meta: Record<string, unknown> | undefined;
  if (attrs?.attributes) {
    const entries = Object.entries(attrs.attributes);
    meta = Object.fromEntries(entries.slice(0, 20));
  }

  const tags = attrs?.tags ?? [];
  const isError =
    tags.some((t) => t === "error" || t.startsWith("error:")) ||
    !!attrs?.attributes?.["error.message"];

  return {
    spanId: attrs?.spanId ?? span.id ?? "",
    traceId: attrs?.traceId ?? "",
    parentId: attrs?.parentId,
    service: attrs?.service,
    resourceName: attrs?.resourceName,
    type: attrs?.type,
    startTimestamp: attrs?.startTimestamp
      ? new Date(attrs.startTimestamp).toISOString()
      : undefined,
    endTimestamp: attrs?.endTimestamp
      ? new Date(attrs.endTimestamp).toISOString()
      : undefined,
    durationMs:
      startMs != null && endMs != null ? endMs - startMs : undefined,
    env: attrs?.env,
    host: attrs?.host,
    isError,
    errorMessage: attrs?.attributes?.["error.message"] as string | undefined,
    tags,
    meta,
  };
}

export interface SearchSpansParams {
  query: string;
  from: string;
  to: string;
  sort?: "timestamp" | "-timestamp";
  limit?: number;
  cursor?: string;
}

export async function searchSpans(
  params: SearchSpansParams
): Promise<SearchSpansResult> {
  const api = getSpansApi();
  const response = await api.listSpansGet({
    filterQuery: params.query,
    filterFrom: params.from,
    filterTo: params.to,
    sort: (params.sort ?? "-timestamp") as v2.SpansSort,
    pageLimit: params.limit ?? 50,
    pageCursor: params.cursor,
  });

  return {
    spans: (response.data ?? []).map(mapSpan),
    cursor: response.meta?.page?.after,
    elapsed: response.meta?.elapsed,
    status: response.meta?.status as string | undefined,
  };
}

export interface AggregateSpansParams {
  query: string;
  from: string;
  to: string;
  compute: Array<{
    aggregation: string;
    metric?: string;
    type?: "total" | "timeseries";
    interval?: string;
  }>;
  groupBy?: Array<{
    facet: string;
    limit?: number;
    sort?: { metric?: string; order?: "asc" | "desc" };
  }>;
}

export async function aggregateSpans(
  params: AggregateSpansParams
): Promise<AggregateSpansResult> {
  const api = getSpansApi();
  const response = await api.aggregateSpans({
    body: {
      data: {
        type: "aggregate_request" as v2.SpansAggregateRequestType,
        attributes: {
          filter: {
            query: params.query,
            from: params.from,
            to: params.to,
          },
          compute: params.compute.map((c) => ({
            aggregation:
              c.aggregation as v2.SpansAggregationFunction,
            metric: c.metric,
            type: c.type as v2.SpansComputeType | undefined,
            interval: c.interval,
          })),
          groupBy: params.groupBy?.map((g) => ({
            facet: g.facet,
            limit: g.limit,
            sort: g.sort
              ? {
                  metric: g.sort.metric,
                  order: g.sort.order as v2.SpansSortOrder | undefined,
                }
              : undefined,
          })),
        },
      },
    },
  });

  return {
    buckets: (response.data ?? []).map((bucket) => ({
      by: bucket.attributes?.by,
      computes: bucket.attributes?.computes as
        | Record<string, unknown>
        | undefined,
    })),
    elapsed: response.meta?.elapsed,
    status: response.meta?.status as string | undefined,
  };
}

export async function getTraceSpans(
  traceId: string
): Promise<SearchSpansResult> {
  return searchSpans({
    query: `trace_id:${traceId}`,
    from: "now-24h",
    to: "now",
    sort: "timestamp",
    limit: 200,
  });
}
