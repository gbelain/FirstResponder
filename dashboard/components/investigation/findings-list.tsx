import type { Finding } from "@shared/types/memory";

const typeLabels: Record<string, string> = {
  error: "Errors",
  metric: "Metrics",
  config_change: "Config Changes",
};

const typeColors: Record<string, string> = {
  error: "text-confidence-low",
  metric: "text-confidence-medium",
  config_change: "text-accent",
};

export function FindingsList({ findings }: { findings: Finding[] }) {
  if (findings.length === 0) {
    return (
      <div className="py-6 text-center text-xs font-mono text-text-muted">
        No findings recorded yet
      </div>
    );
  }

  // Group by type
  const grouped = findings.reduce(
    (acc, f) => {
      (acc[f.type] ??= []).push(f);
      return acc;
    },
    {} as Record<string, Finding[]>
  );

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([type, items]) => (
        <div key={type} className="space-y-2">
          <h4
            className={`text-[10px] font-mono font-medium uppercase tracking-wider ${typeColors[type] || "text-text-muted"}`}
          >
            {typeLabels[type] || type} ({items.length})
          </h4>
          <div className="space-y-1.5">
            {items.map((finding, i) => (
              <div
                key={i}
                className="rounded border border-border-subtle bg-bg-surface px-3 py-2 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-text-primary">{finding.description}</span>
                  {finding.value && (
                    <span className="font-mono text-text-muted shrink-0">{finding.value}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-text-muted font-mono">
                  <span className="rounded bg-bg-elevated px-1.5 py-0.5 border border-border-subtle">
                    {finding.service}
                  </span>
                  <span>
                    {new Date(finding.timestamp).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                      timeZone: "UTC",
                    })}{" "}
                    UTC
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
