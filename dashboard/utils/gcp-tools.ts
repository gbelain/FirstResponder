import { tool } from "ai";
import { z } from "zod";
import { listLogEntries } from "@/utils/gcp/logging";
import {
  listTimeSeries,
  listMetricDescriptors,
  listAlertPolicies,
} from "@/utils/gcp/monitoring";

export function createGcpTools() {
  return {
    list_log_entries: tool({
      description:
        "Query Google Cloud Logging entries. Use this to investigate incidents by searching for errors, warnings, and patterns in GKE container logs. Always include a timestamp filter and resource.type in the filter.",
      inputSchema: z.object({
        resourceNames: z
          .array(z.string())
          .describe('Resource names to scope the query, e.g. ["projects/alg-ai-platform-staging"]'),
        filter: z
          .string()
          .optional()
          .describe(
            'Cloud Logging filter expression, e.g. resource.type="k8s_container" AND severity>=ERROR AND timestamp>="2026-01-01T00:00:00Z"'
          ),
        orderBy: z
          .string()
          .optional()
          .describe('Sort order, e.g. "timestamp desc" or "timestamp asc"'),
        pageSize: z.number().optional().describe("Max entries to return (default 50)"),
        pageToken: z.string().optional().describe("Pagination token from previous response"),
      }),
      execute: async (params) => {
        return await listLogEntries(params);
      },
    }),

    list_time_series: tool({
      description:
        "Query Google Cloud Monitoring time series data. Use this to check resource metrics like CPU, memory, restarts, and custom metrics for GKE containers.",
      inputSchema: z.object({
        name: z.string().describe('Project resource name, e.g. "projects/alg-ai-platform-staging"'),
        filter: z
          .string()
          .describe(
            'Monitoring filter, e.g. metric.type = "kubernetes.io/container/cpu/limit_utilization" AND resource.type = "k8s_container"'
          ),
        interval: z.object({
          startTime: z.string().describe("Start of the time interval (ISO 8601 UTC)"),
          endTime: z.string().describe("End of the time interval (ISO 8601 UTC)"),
        }),
        aggregation: z
          .object({
            alignmentPeriod: z
              .string()
              .optional()
              .describe('Alignment period, e.g. "60s", "300s"'),
            perSeriesAligner: z
              .string()
              .optional()
              .describe("Aligner, e.g. ALIGN_MEAN, ALIGN_RATE, ALIGN_DELTA"),
            crossSeriesReducer: z
              .string()
              .optional()
              .describe("Reducer, e.g. REDUCE_SUM, REDUCE_MEAN"),
            groupByFields: z.array(z.string()).optional(),
          })
          .optional(),
        pageSize: z.number().optional(),
        pageToken: z.string().optional(),
      }),
      execute: async (params) => {
        return await listTimeSeries(params);
      },
    }),

    list_metric_descriptors: tool({
      description:
        "List available metric descriptors for a project. Use this to discover what metrics are available before querying time series.",
      inputSchema: z.object({
        name: z.string().describe('Project resource name, e.g. "projects/alg-ai-platform-staging"'),
        filter: z
          .string()
          .optional()
          .describe('Filter expression, e.g. metric.type = starts_with("kubernetes.io/container/")'),
        pageSize: z.number().optional(),
        pageToken: z.string().optional(),
      }),
      execute: async (params) => {
        return await listMetricDescriptors(params);
      },
    }),

    list_alert_policies: tool({
      description:
        "List alert policies for a project. Use this to check if any alerts are configured or firing for affected services.",
      inputSchema: z.object({
        name: z.string().describe('Project resource name, e.g. "projects/alg-ai-platform-staging"'),
        filter: z.string().optional().describe("Filter expression"),
        pageSize: z.number().optional(),
        pageToken: z.string().optional(),
      }),
      execute: async (params) => {
        return await listAlertPolicies(params);
      },
    }),
  };
}
