import { getAccessToken } from "./auth";
import type {
  ListTimeSeriesResponse,
  ListMetricDescriptorsResponse,
  ListAlertPoliciesResponse,
} from "./types";

const MONITORING_API = "https://monitoring.googleapis.com/v3";

// ---- Time Series ----

export interface ListTimeSeriesParams {
  name: string; // "projects/{project_id}"
  filter: string;
  interval: { startTime: string; endTime: string };
  aggregation?: {
    alignmentPeriod?: string;
    perSeriesAligner?: string;
    crossSeriesReducer?: string;
    groupByFields?: string[];
  };
  pageSize?: number;
  pageToken?: string;
}

export async function listTimeSeries(
  params: ListTimeSeriesParams
): Promise<ListTimeSeriesResponse> {
  const token = await getAccessToken();

  const qs = new URLSearchParams();
  qs.set("filter", params.filter);
  qs.set("interval.startTime", params.interval.startTime);
  qs.set("interval.endTime", params.interval.endTime);
  if (params.pageSize) qs.set("pageSize", String(params.pageSize));
  if (params.pageToken) qs.set("pageToken", params.pageToken);

  if (params.aggregation) {
    const agg = params.aggregation;
    if (agg.alignmentPeriod) {
      // Normalize: ensure it ends with "s"
      const period = agg.alignmentPeriod.endsWith("s")
        ? agg.alignmentPeriod
        : `${agg.alignmentPeriod}s`;
      qs.set("aggregation.alignmentPeriod", period);
    }
    if (agg.perSeriesAligner) qs.set("aggregation.perSeriesAligner", agg.perSeriesAligner);
    if (agg.crossSeriesReducer) qs.set("aggregation.crossSeriesReducer", agg.crossSeriesReducer);
    if (agg.groupByFields) {
      for (const field of agg.groupByFields) {
        qs.append("aggregation.groupByFields", field);
      }
    }
  }

  const url = `${MONITORING_API}/${params.name}/timeSeries?${qs.toString()}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloud Monitoring API error ${res.status}: ${text}`);
  }

  return (await res.json()) as ListTimeSeriesResponse;
}

// ---- Metric Descriptors ----

export interface ListMetricDescriptorsParams {
  name: string; // "projects/{project_id}"
  filter?: string;
  pageSize?: number;
  pageToken?: string;
}

export async function listMetricDescriptors(
  params: ListMetricDescriptorsParams
): Promise<ListMetricDescriptorsResponse> {
  const token = await getAccessToken();

  const qs = new URLSearchParams();
  if (params.filter) qs.set("filter", params.filter);
  if (params.pageSize) qs.set("pageSize", String(params.pageSize));
  if (params.pageToken) qs.set("pageToken", params.pageToken);

  const url = `${MONITORING_API}/${params.name}/metricDescriptors?${qs.toString()}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Metric Descriptors API error ${res.status}: ${text}`);
  }

  return (await res.json()) as ListMetricDescriptorsResponse;
}

// ---- Alert Policies ----

export interface ListAlertPoliciesParams {
  name: string; // "projects/{project_id}"
  filter?: string;
  pageSize?: number;
  pageToken?: string;
}

export async function listAlertPolicies(
  params: ListAlertPoliciesParams
): Promise<ListAlertPoliciesResponse> {
  const token = await getAccessToken();

  const qs = new URLSearchParams();
  if (params.filter) qs.set("filter", params.filter);
  if (params.pageSize) qs.set("pageSize", String(params.pageSize));
  if (params.pageToken) qs.set("pageToken", params.pageToken);

  const url = `${MONITORING_API}/${params.name}/alertPolicies?${qs.toString()}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Alert Policies API error ${res.status}: ${text}`);
  }

  return (await res.json()) as ListAlertPoliciesResponse;
}
