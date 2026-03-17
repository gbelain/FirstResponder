import type { Confidence, Severity, IncidentStatus, HypothesisStatus } from "@shared/types/memory";

const severityStyles: Record<Severity, string> = {
  critical: "bg-severity-critical/15 text-severity-critical border-severity-critical/30",
  high: "bg-severity-high/15 text-severity-high border-severity-high/30",
  medium: "bg-severity-medium/15 text-severity-medium border-severity-medium/30",
  low: "bg-severity-low/15 text-severity-low border-severity-low/30",
};

const confidenceStyles: Record<Confidence, string> = {
  high: "bg-confidence-high/15 text-confidence-high border-confidence-high/30",
  medium: "bg-confidence-medium/15 text-confidence-medium border-confidence-medium/30",
  low: "bg-confidence-low/15 text-confidence-low border-confidence-low/30",
};

const statusStyles: Record<IncidentStatus, string> = {
  investigating: "bg-status-investigating/15 text-status-investigating border-status-investigating/30",
  resolved: "bg-status-resolved/15 text-status-resolved border-status-resolved/30",
  escalated: "bg-status-escalated/15 text-status-escalated border-status-escalated/30",
};

const hypothesisStatusStyles: Record<HypothesisStatus, string> = {
  investigating: "bg-status-investigating/15 text-status-investigating border-status-investigating/30",
  confirmed_root_cause: "bg-confidence-high/15 text-confidence-high border-confidence-high/30",
  ruled_out: "bg-bg-elevated text-text-muted border-border-subtle",
};

function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-mono font-medium uppercase tracking-wider ${className}`}
    >
      {children}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <Badge className={severityStyles[severity]}>{severity}</Badge>;
}

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  return <Badge className={confidenceStyles[confidence]}>{confidence}</Badge>;
}

export function StatusBadge({ status }: { status: IncidentStatus }) {
  return <Badge className={statusStyles[status]}>{status}</Badge>;
}

export function HypothesisStatusBadge({ status }: { status: HypothesisStatus }) {
  const label = status === "confirmed_root_cause" ? "root cause" : status.replace("_", " ");
  return <Badge className={hypothesisStatusStyles[status]}>{label}</Badge>;
}

export function SourceBadge({ source }: { source: string }) {
  return (
    <Badge className="bg-bg-elevated text-text-muted border-border-subtle">{source}</Badge>
  );
}

export function ToolBadge({ isMemoryTool }: { isMemoryTool: boolean }) {
  return (
    <Badge
      className={
        isMemoryTool
          ? "bg-accent/10 text-accent border-accent/30"
          : "bg-severity-high/10 text-severity-high border-severity-high/30"
      }
    >
      {isMemoryTool ? "memory" : "gcp"}
    </Badge>
  );
}
