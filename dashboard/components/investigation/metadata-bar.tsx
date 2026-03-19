"use client";

import { useEffect, useState } from "react";
import type { IncidentMemory } from "@shared/types/memory";
import { SeverityBadge, StatusBadge } from "@/components/ui/badge";

function isRecentlyActive(lastSeen: string, thresholdMs = 30_000): boolean {
  return Date.now() - new Date(lastSeen).getTime() < thresholdMs;
}

export function MetadataBar({ incident }: { incident: IncidentMemory }) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    function update() {
      const start = new Date(incident.metadata.started_at).getTime();
      const diff = Date.now() - start;
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      if (hours > 0) {
        setElapsed(`${hours}h ${minutes}m`);
      } else {
        setElapsed(`${minutes}m`);
      }
    }
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [incident.metadata.started_at]);

  const activeInvestigators = (incident.active_investigators ?? []).filter(
    (inv) => isRecentlyActive(inv.last_seen)
  );

  return (
    <div className="border-b border-border-subtle px-4 py-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-sm font-mono font-bold text-text-primary truncate">
          {incident.incident_name}
        </h1>
        <div className="flex items-center gap-2 shrink-0">
          <SeverityBadge severity={incident.metadata.severity} />
          <StatusBadge status={incident.metadata.status} />
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs font-mono text-text-muted">
        <span>{elapsed} elapsed</span>
        <span className="text-border-strong">|</span>
        <span>{incident.metadata.investigators?.join(", ") ?? "unknown"}</span>
        {activeInvestigators.length > 0 && (
          <>
            <span className="text-border-strong">|</span>
            <div className="flex items-center gap-1.5">
              {activeInvestigators.map((inv) => (
                <span
                  key={inv.name}
                  className="inline-flex items-center gap-1 rounded bg-bg-elevated px-1.5 py-0.5 text-text-secondary border border-border-subtle"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-confidence-high animate-pulse" />
                  {inv.name}
                </span>
              ))}
            </div>
          </>
        )}
        <span className="text-border-strong">|</span>
        <div className="flex gap-1.5">
          {incident.metadata.affected_services.map((svc) => (
            <span
              key={svc}
              className="rounded bg-bg-elevated px-1.5 py-0.5 text-text-secondary border border-border-subtle"
            >
              {svc}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
