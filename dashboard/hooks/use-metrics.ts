import useSWR from "swr";
import type { MetricsResponse } from "@/types/metrics";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) return null;
    return r.json();
  });

export function useMetrics(incidentId: string | null) {
  return useSWR<MetricsResponse | null>(
    incidentId && incidentId !== "new"
      ? `/api/investigation/${incidentId}/metrics`
      : null,
    fetcher,
    { refreshInterval: 30_000 }
  );
}
