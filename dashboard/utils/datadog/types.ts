export interface SpanSummary {
  spanId: string;
  traceId: string;
  parentId?: string;
  service?: string;
  resourceName?: string;
  type?: string;
  startTimestamp?: string;
  endTimestamp?: string;
  durationMs?: number;
  env?: string;
  host?: string;
  isError: boolean;
  errorMessage?: string;
  tags?: string[];
  meta?: Record<string, unknown>;
}

export interface SearchSpansResult {
  spans: SpanSummary[];
  cursor?: string;
  elapsed?: number;
  status?: string;
}

export interface AggregateBucket {
  by?: Record<string, unknown>;
  computes?: Record<string, unknown>;
}

export interface AggregateSpansResult {
  buckets: AggregateBucket[];
  elapsed?: number;
  status?: string;
}
