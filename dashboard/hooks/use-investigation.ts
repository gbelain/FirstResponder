import useSWR from "swr";
import type { IncidentMemory } from "@shared/types/memory";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) return null;
    return r.json();
  });

export function useInvestigation(incidentId: string | null) {
  return useSWR<IncidentMemory | null>(
    incidentId && incidentId !== "new" ? `/api/investigation/${incidentId}` : null,
    fetcher,
    { refreshInterval: 1500 }
  );
}
