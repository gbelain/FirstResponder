import { GoogleAuth } from "google-auth-library";

const SCOPES = ["https://www.googleapis.com/auth/cloud-platform"];

let authInstance: GoogleAuth | null = null;

function getAuth(): GoogleAuth {
  if (authInstance) return authInstance;

  const keyJson = process.env.GCP_SERVICE_ACCOUNT_KEY;
  if (keyJson) {
    // Vercel / CI: credentials from env var (JSON string)
    const credentials = JSON.parse(keyJson);
    authInstance = new GoogleAuth({ credentials, scopes: SCOPES });
  } else {
    // Local dev: Application Default Credentials (gcloud auth)
    authInstance = new GoogleAuth({ scopes: SCOPES });
  }

  return authInstance;
}

export async function getAccessToken(): Promise<string> {
  const auth = getAuth();
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const token = tokenResponse.token;
  if (!token) throw new Error("Failed to obtain GCP access token");
  return token;
}
