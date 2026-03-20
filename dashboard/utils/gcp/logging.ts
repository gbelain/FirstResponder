import { getAccessToken } from "./auth";
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
  const token = await getAccessToken();

  const body: Record<string, unknown> = {
    resourceNames: params.resourceNames,
    pageSize: params.pageSize ?? 50,
  };
  if (params.filter) body.filter = params.filter;
  if (params.orderBy) body.orderBy = params.orderBy;
  if (params.pageToken) body.pageToken = params.pageToken;

  const res = await fetch(LOGGING_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  console.log(`[gcp-logging] API response status: ${res.status} ${res.statusText}`);

  if (!res.ok) {
    const text = await res.text();
    console.error(`[gcp-logging] API error body: ${text.substring(0, 500)}`);
    throw new Error(`Cloud Logging API error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as ListLogEntriesResponse;
  console.log(`[gcp-logging] returned ${data.entries?.length ?? 0} entries, hasNextPage: ${!!data.nextPageToken}`);
  return data;
}
