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

/**
 * Migrate legacy records that have `investigator` (string) instead of
 * `investigators` (array), and fill in missing multi-user fields.
 */
function migrateRecord(record: Record<string, unknown>): IncidentMemory {
  const { objectID, _highlightResult, _snippetResult, _rankingInfo, ...rest } =
    record;

  // Migrate investigator → investigators
  const metadata = rest.metadata as Record<string, unknown> | undefined;
  if (metadata && !metadata.investigators && metadata.investigator) {
    metadata.investigators = [metadata.investigator as string];
    delete metadata.investigator;
  }

  // Ensure _version
  if (rest._version === undefined || rest._version === null) {
    rest._version = 0;
  }

  // Ensure active_investigators
  if (!Array.isArray(rest.active_investigators)) {
    rest.active_investigators = [];
  }

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
    return migrateRecord(record as Record<string, unknown>);
  } catch (error) {
    if (isNotFoundError(error)) {
      return null;
    }
    throw error;
  }
}

export async function loadMemoryWithVersion(
  incidentId: string
): Promise<{ memory: IncidentMemory; version: number } | null> {
  const memory = await loadMemory(incidentId);
  if (!memory) return null;
  return { memory, version: memory._version };
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

export async function saveMemoryVersioned(
  memory: IncidentMemory,
  expectedVersion: number
): Promise<{ success: boolean }> {
  // Read current version
  try {
    const record = await getClient().getObject({
      indexName: getIndexName(),
      objectID: memory.incident_id,
      attributesToRetrieve: ["_version"],
    });
    const currentVersion =
      (record as Record<string, unknown>)._version ?? 0;
    if (currentVersion !== expectedVersion) {
      return { success: false };
    }
  } catch (error) {
    if (isNotFoundError(error)) {
      // Object doesn't exist yet, allow version 0
      if (expectedVersion !== 0) return { success: false };
    } else {
      throw error;
    }
  }

  memory._version = expectedVersion + 1;
  await saveMemory(memory);
  return { success: true };
}

/**
 * Partial update — writes only the specified top-level fields, leaving others
 * untouched. Uses Algolia's partialUpdateObjects under the hood.
 */
export async function partialUpdate(
  incidentId: string,
  fields: Record<string, unknown>
): Promise<void> {
  await getClient().partialUpdateObjects({
    indexName: getIndexName(),
    objects: [
      {
        objectID: incidentId,
        ...fields,
      },
    ],
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
