import { client, v2 } from "@datadog/datadog-api-client";

let spansApi: v2.SpansApi | null = null;

export function getSpansApi(): v2.SpansApi {
  if (!spansApi) {
    const configuration = client.createConfiguration();
    spansApi = new v2.SpansApi(configuration);
  }
  return spansApi;
}
