import { GoogleAuth } from "google-auth-library";

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

export async function getAccessToken(): Promise<string> {
  const auth = getAuth();
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const token = tokenResponse.token;
  if (!token) {
    console.error("[gcp-auth] getAccessToken returned empty token");
    throw new Error("Failed to obtain GCP access token");
  }
  console.log(`[gcp-auth] token acquired (length=${token.length})`);
  return token;
}
