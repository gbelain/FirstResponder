/**
 * Memory persistence layer — Algolia index backend
 * Handles reading/writing incident memory objects to Algolia
 */

import { algoliasearch } from "algoliasearch";
import type { Algoliasearch } from "algoliasearch";
import type { IncidentMemory } from "../types/memory.js";

let _client: Algoliasearch | null = null;

function getClient(): Algoliasearch {
  if (!_client) {
    const appId = process.env.ALGOLIA_APP_ID;
    const apiKey = process.env.ALGOLIA_API_KEY;
    if (!appId || !apiKey) {
      throw new Error(
        "Missing ALGOLIA_APP_ID or ALGOLIA_API_KEY environment variables"
      );
    }
    _client = algoliasearch(appId, apiKey);
  }
  return _client;
}

function getIndexName(): string {
  return process.env.ALGOLIA_INDEX_NAME || "firstresponder_incidents";
}

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status: number }).status === 404
  );
}

function stripAlgoliaFields(record: Record<string, unknown>): IncidentMemory {
  const { objectID, _highlightResult, _snippetResult, _rankingInfo, ...rest } =
    record;
  return rest as unknown as IncidentMemory;
}

export async function ensureMemoryDir(): Promise<void> {
  // No-op — Algolia index is always available
}

export async function loadMemory(
  incidentId: string
): Promise<IncidentMemory | null> {
  try {
    const record = await getClient().getObject({
      indexName: getIndexName(),
      objectID: incidentId,
    });
    return stripAlgoliaFields(record as Record<string, unknown>);
  } catch (error) {
    if (isNotFoundError(error)) {
      return null;
    }
    throw error;
  }
}

export async function saveMemory(memory: IncidentMemory): Promise<void> {
  await getClient().saveObject({
    indexName: getIndexName(),
    body: {
      objectID: memory.incident_id,
      ...memory,
    },
  });
}

export async function memoryExists(incidentId: string): Promise<boolean> {
  try {
    await getClient().getObject({
      indexName: getIndexName(),
      objectID: incidentId,
      attributesToRetrieve: ["incident_id"],
    });
    return true;
  } catch (error) {
    if (isNotFoundError(error)) {
      return false;
    }
    throw error;
  }
}

export async function listIncidents(): Promise<string[]> {
  try {
    const response = await getClient().searchSingleIndex({
      indexName: getIndexName(),
      searchParams: {
        query: "",
        attributesToRetrieve: ["incident_id"],
        hitsPerPage: 1000,
      },
    });
    return response.hits.map(
      (hit: { incident_id?: string; objectID: string }) =>
        hit.incident_id || hit.objectID
    );
  } catch {
    return [];
  }
}
