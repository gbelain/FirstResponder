/**
 * HTTP client for the Agent Studio Memory REST API.
 * Handles auth, serialization, and error reporting.
 */

// --- Types for Agent Studio Memory API ---

export interface MemoryRecord {
  objectID: string;
  memoryType: "semantic" | "episodic";
  text: string;
  rawExtract: string;
  keywords: string[];
  topics: string[];
  recallTriggers: string[];
  _tags: string[];
  episode: { observation: string; thoughts: string; action: string; result: string } | null;
  agentIDs: string[];
  userID: string;
  createdAt: number;
  updatedAt: number;
}

export interface SaveSemanticParams {
  text: string;
  raw_extract: string;
  keywords: string[];
  topics: string[];
  recall_triggers: string[];
  agent_ids: string[];
  wait?: boolean;
}

export interface SaveEpisodicParams {
  text: string;
  raw_extract: string;
  observation: string;
  thoughts: string;
  action: string;
  result: string;
  keywords: string[];
  topics: string[];
  recall_triggers: string[];
  agent_ids: string[];
  wait?: boolean;
}

export interface SearchParams {
  queries: string[];
  keywords?: string[];
  topics?: string[];
  agent_ids?: string[];
  memory_type?: "semantic" | "episodic";
  limit?: number;
}

export interface SearchResult {
  hits: MemoryRecord[];
  nbHits: number;
}

export interface SaveResponse {
  objectID: string;
  taskID?: number;
}

// --- HTTP helpers ---

function getBaseUrl(): string {
  return process.env.MEMORY_API_BASE_URL || "https://agent-studio-staging.eu.algolia.com/1/memory";
}

function getHeaders(): Record<string, string> {
  const appId = process.env.MEMORY_API_APP_ID;
  const apiKey = process.env.MEMORY_API_KEY;
  const userToken = process.env.MEMORY_API_USER_TOKEN;

  if (!appId || !apiKey) {
    throw new Error("MEMORY_API_APP_ID and MEMORY_API_KEY must be set in .env");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Algolia-Application-Id": appId,
    "X-Algolia-API-Key": apiKey,
  };

  if (userToken) {
    headers["X-Algolia-Secure-User-Token"] = userToken;
  }

  return headers;
}

async function apiRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const url = `${getBaseUrl()}${path}`;
  const response = await fetch(url, {
    method,
    headers: getHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Memory API ${method} ${path} failed (${response.status}): ${text}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

// --- Public API ---

export async function saveSemantic(params: SaveSemanticParams): Promise<SaveResponse> {
  return apiRequest<SaveResponse>("POST", "/semantic", params);
}

export async function saveEpisodic(params: SaveEpisodicParams): Promise<SaveResponse> {
  return apiRequest<SaveResponse>("POST", "/episodic", params);
}

export async function searchMemories(params: SearchParams): Promise<SearchResult> {
  return apiRequest<SearchResult>("POST", "/search", params);
}

export async function getMemory(memoryId: string): Promise<MemoryRecord> {
  return apiRequest<MemoryRecord>("GET", `/${memoryId}`);
}

export async function patchMemory(memoryId: string, params: Partial<SaveSemanticParams>): Promise<SaveResponse> {
  return apiRequest<SaveResponse>("PATCH", `/${memoryId}`, params);
}

export async function deleteMemory(memoryId: string): Promise<void> {
  return apiRequest<void>("DELETE", `/${memoryId}`);
}
