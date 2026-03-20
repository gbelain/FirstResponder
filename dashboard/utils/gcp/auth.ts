import { GoogleAuth } from "google-auth-library";
import type { AuthClient } from "google-auth-library";

const SCOPES = ["https://www.googleapis.com/auth/cloud-platform"];

let authInstance: GoogleAuth | null = null;

function getAuth(): GoogleAuth {
  if (authInstance) return authInstance;

  const keyJson = process.env.GCP_SERVICE_ACCOUNT_KEY;
  if (keyJson) {
    const credentials = JSON.parse(keyJson);
    console.log(`[gcp-auth] using service account: ${credentials.client_email ?? "unknown"}, project: ${credentials.project_id ?? "unknown"}`);
    if (credentials.private_key) {
      const hadEscaped = credentials.private_key.includes("\\n");
      credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
      if (hadEscaped) console.log("[gcp-auth] fixed double-escaped newlines in private_key");
    }
    authInstance = new GoogleAuth({ credentials, scopes: SCOPES });
  } else {
    console.log("[gcp-auth] no GCP_SERVICE_ACCOUNT_KEY, falling back to Application Default Credentials");
    authInstance = new GoogleAuth({ scopes: SCOPES });
  }

  return authInstance;
}

export async function getAuthClient(): Promise<AuthClient> {
  const auth = getAuth();
  return auth.getClient();
}

/**
 * Make an authenticated GET request to a GCP API.
 */
export async function gcpGet<T>(url: string): Promise<T> {
  const client = await getAuthClient();
  console.log(`[gcp-request] GET ${url.substring(0, 120)}`);
  const res = await client.request<T>({ url, method: "GET" });
  console.log(`[gcp-request] GET ${res.status} ${typeof res.data === "object" ? "json" : typeof res.data}`);
  return res.data;
}

/**
 * Make an authenticated POST request to a GCP API.
 */
export async function gcpPost<T>(url: string, data: unknown): Promise<T> {
  const client = await getAuthClient();
  console.log(`[gcp-request] POST ${url}`);
  const res = await client.request<T>({ url, method: "POST", data });
  console.log(`[gcp-request] POST ${res.status} ${typeof res.data === "object" ? "json" : typeof res.data}`);
  return res.data;
}
