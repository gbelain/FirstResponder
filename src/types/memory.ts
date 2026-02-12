/**
 * Memory schema types for FirstResponder incident investigations
 * Based on 1_spec_phase_one.md memory structure
 */

export type IncidentStatus = "investigating" | "resolved" | "escalated";
export type Severity = "critical" | "high" | "medium" | "low";
export type HypothesisStatus = "investigating" | "confirmed_root_cause" | "ruled_out";
export type Confidence = "high" | "medium" | "low";
export type EventSource = "logs" | "user" | "agent" | "metrics";
export type FindingType = "error" | "metric" | "config_change";

export interface Metadata {
  started_at: string; // ISO 8601 UTC
  status: IncidentStatus;
  severity: Severity;
  affected_services: string[];
  investigator: string;
}

export interface TLDR {
  summary: string;
  last_updated: string; // ISO 8601 UTC
}

export interface TimelineEvent {
  timestamp: string; // ISO 8601 UTC
  event: string;
  source: EventSource;
  details: string;
}

export interface Hypothesis {
  id: string;
  title: string;
  proposed_at: string; // ISO 8601 UTC
  proposed_by: "agent" | "user";
  status: HypothesisStatus;
  confidence: Confidence;
  supporting_evidence: string[];
  counter_evidence: string[];
  ruled_out_at?: string; // ISO 8601 UTC, present when status is "ruled_out"
}

export interface Finding {
  type: FindingType;
  description: string;
  service: string;
  timestamp: string; // ISO 8601 UTC
  value?: string; // Optional additional info (count, metric value, etc.)
}

export interface RuledOutEntry {
  hypothesis: string;
  reason: string;
  ruled_out_at: string; // ISO 8601 UTC
}

export interface IncidentMemory {
  incident_id: string;
  incident_name: string;
  metadata: Metadata;
  tldr: TLDR;
  timeline: TimelineEvent[];
  hypotheses: Hypothesis[];
  findings: Finding[];
  ruled_out: RuledOutEntry[];
}
