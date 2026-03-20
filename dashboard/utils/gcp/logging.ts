import { gcpPost } from "./auth";
import type { ListLogEntriesResponse } from "./types";

const LOGGING_API = "https://logging.googleapis.com/v2/entries:list";

export interface ListLogEntriesParams {
  resourceNames: string[];
  filter?: string;
  orderBy?: string;
  pageSize?: number;
  pageToken?: string;
}

export async function listLogEntries(
  params: ListLogEntriesParams
): Promise<ListLogEntriesResponse> {
  const body: Record<string, unknown> = {
    resourceNames: params.resourceNames,
    pageSize: params.pageSize ?? 50,
  };
  if (params.filter) body.filter = params.filter;
  if (params.orderBy) body.orderBy = params.orderBy;
  if (params.pageToken) body.pageToken = params.pageToken;

  const data = await gcpPost<ListLogEntriesResponse>(LOGGING_API, body);
  console.log(`[gcp-logging] returned ${data.entries?.length ?? 0} entries, hasNextPage: ${!!data.nextPageToken}`);
  return data;
}
