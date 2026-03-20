// ----- Cloud Logging v2 -----

export interface LogEntry {
  logName?: string;
  resource?: {
    type?: string;
    labels?: Record<string, string>;
  };
  timestamp?: string;
  receiveTimestamp?: string;
  severity?: string;
  insertId?: string;
  labels?: Record<string, string>;
  textPayload?: string;
  jsonPayload?: Record<string, unknown>;
  protoPayload?: Record<string, unknown>;
  httpRequest?: Record<string, unknown>;
  operation?: {
    id?: string;
    producer?: string;
    first?: boolean;
    last?: boolean;
  };
  trace?: string;
  spanId?: string;
  traceSampled?: boolean;
  sourceLocation?: {
    file?: string;
    line?: string;
    function?: string;
  };
}

export interface ListLogEntriesResponse {
  entries?: LogEntry[];
  nextPageToken?: string;
}

// ----- Cloud Monitoring v3 -----

export interface TypedValue {
  boolValue?: boolean;
  int64Value?: string;
  doubleValue?: number;
  stringValue?: string;
  distributionValue?: Record<string, unknown>;
}

export interface TimeInterval {
  startTime?: string;
  endTime?: string;
}

export interface Point {
  interval?: TimeInterval;
  value?: TypedValue;
}

export interface TimeSeries {
  metric?: {
    type?: string;
    labels?: Record<string, string>;
  };
  resource?: {
    type?: string;
    labels?: Record<string, string>;
  };
  metricKind?: string;
  valueType?: string;
  points?: Point[];
}

export interface ListTimeSeriesResponse {
  timeSeries?: TimeSeries[];
  nextPageToken?: string;
  executionErrors?: Array<{ code?: number; message?: string }>;
}

export interface MetricDescriptor {
  name?: string;
  type?: string;
  labels?: Array<{ key?: string; valueType?: string; description?: string }>;
  metricKind?: string;
  valueType?: string;
  unit?: string;
  description?: string;
  displayName?: string;
}

export interface ListMetricDescriptorsResponse {
  metricDescriptors?: MetricDescriptor[];
  nextPageToken?: string;
}

export interface AlertPolicy {
  name?: string;
  displayName?: string;
  documentation?: { content?: string; mimeType?: string };
  conditions?: Array<{
    displayName?: string;
    conditionThreshold?: Record<string, unknown>;
    conditionAbsent?: Record<string, unknown>;
  }>;
  enabled?: { value?: boolean };
  combiner?: string;
  creationRecord?: { mutateTime?: string; mutatedBy?: string };
  mutationRecord?: { mutateTime?: string; mutatedBy?: string };
}

export interface ListAlertPoliciesResponse {
  alertPolicies?: AlertPolicy[];
  nextPageToken?: string;
}
