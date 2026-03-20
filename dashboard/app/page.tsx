"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SeverityBadge, StatusBadge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { IncidentStatus, Severity } from "@/types/memory";

interface IncidentSummary {
  id: string;
  name: string;
  status: IncidentStatus;
  severity: Severity;
  started_at: string;
}

export default function Home() {
  const [incidents, setIncidents] = useState<IncidentSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/incidents")
      .then((r) => r.json())
      .then((data) => setIncidents(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-2 relative">
          <div className="absolute right-0 top-0">
            <ThemeToggle />
          </div>
          <h1 className="text-2xl font-mono font-bold text-text-primary tracking-tight">
            FirstResponder
          </h1>
          <p className="text-sm text-text-muted font-mono">
            AI-powered incident investigation
          </p>
        </div>

        {/* New Investigation */}
        <Link
          href="/investigation/new"
          className="flex items-center justify-center gap-2 rounded-md border border-accent/30 bg-accent/10 px-4 py-3 text-sm font-mono font-medium text-accent hover:bg-accent/20 transition-colors w-full"
        >
          <span className="text-lg leading-none">+</span>
          New Investigation
        </Link>

        {/* Existing Incidents */}
        {loading ? (
          <div className="flex justify-center py-8">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent" />
          </div>
        ) : incidents.length > 0 ? (
          <div className="space-y-2">
            <h2 className="text-xs font-mono font-medium text-text-muted uppercase tracking-wider">
              Existing Investigations
            </h2>
            <div className="space-y-1.5">
              {incidents.map((inc) => (
                <Link
                  key={inc.id}
                  href={`/investigation/${inc.id}`}
                  className="flex items-center justify-between gap-3 rounded-md border border-border-subtle bg-bg-surface px-4 py-3 hover:border-border-strong hover:bg-bg-elevated transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-mono text-text-primary truncate group-hover:text-accent transition-colors">
                      {inc.name}
                    </p>
                    <p className="text-xs font-mono text-text-muted mt-0.5">
                      {new Date(inc.started_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "UTC",
                      })}{" "}
                      UTC
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <SeverityBadge severity={inc.severity} />
                    <StatusBadge status={inc.status} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-center text-xs font-mono text-text-muted py-8">
            No investigations yet. Start one above.
          </p>
        )}
      </div>
    </div>
  );
}
