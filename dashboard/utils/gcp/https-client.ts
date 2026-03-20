import https from "node:https";

interface HttpsResponse {
  status: number;
  body: string;
}

/**
 * Raw HTTPS request using node:https — completely bypasses globalThis.fetch
 * and any Next.js fetch patching.
 */
function rawRequest(
  url: string,
  options: { method: string; headers: Record<string, string>; body?: string }
): Promise<HttpsResponse> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: options.method,
        headers: options.headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString("utf-8"),
          });
        });
      }
    );
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

export async function gcpGet<T>(url: string, token: string): Promise<T> {
  console.log(`[gcp-https] GET ${url.substring(0, 120)}`);

  const res = await rawRequest(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  console.log(`[gcp-https] GET status=${res.status} bodyLength=${res.body.length} preview=${res.body.substring(0, 80)}`);

  if (res.status < 200 || res.status >= 300) {
    throw new Error(`GCP API error ${res.status}: ${res.body.substring(0, 500)}`);
  }

  return JSON.parse(res.body) as T;
}

export async function gcpPost<T>(url: string, token: string, data: unknown): Promise<T> {
  console.log(`[gcp-https] POST ${url}`);

  const body = JSON.stringify(data);
  const res = await rawRequest(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body,
  });

  console.log(`[gcp-https] POST status=${res.status} bodyLength=${res.body.length} preview=${res.body.substring(0, 80)}`);

  if (res.status < 200 || res.status >= 300) {
    throw new Error(`GCP API error ${res.status}: ${res.body.substring(0, 500)}`);
  }

  return JSON.parse(res.body) as T;
}
