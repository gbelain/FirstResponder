/**
 * Memory operations for incident investigation
 * Higher-level functions used by agent tools
 */

import type {
  IncidentMemory,
  Severity,
  TimelineEvent,
  EventSource,
  Hypothesis,
  Confidence,
  Finding,
  FindingType,
} from "../types/memory.js";
import { loadMemory, saveMemory } from "./storage.js";

function utcNow(): string {
  return new Date().toISOString();
}

function generateIncidentId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `inc_${timestamp}_${random}`;
}

function generateHypothesisId(memory: IncidentMemory): string {
  const count = memory.hypotheses.length + 1;
  return `hyp_${count}`;
}

// --- Incident Creation ---

export interface CreateIncidentParams {
  name: string;
  severity: Severity;
  affected_services: string[];
  investigator: string;
  initial_description: string;
}

export async function createIncident(params: CreateIncidentParams): Promise<IncidentMemory> {
  const now = utcNow();
  const memory: IncidentMemory = {
    incident_id: generateIncidentId(),
    incident_name: params.name,
    metadata: {
      started_at: now,
      status: "investigating",
      severity: params.severity,
      affected_services: params.affected_services,
      investigator: params.investigator,
    },
    tldr: {
      summary: params.initial_description,
      last_updated: now,
    },
    timeline: [
      {
        timestamp: now,
        event: "Investigation started",
        source: "user",
        details: params.initial_description,
      },
    ],
    hypotheses: [],
    findings: [],
    ruled_out: [],
  };

  await saveMemory(memory);
  return memory;
}

// --- Timeline Operations ---

export interface AddTimelineEventParams {
  incident_id: string;
  event: string;
  source: EventSource;
  details: string;
  timestamp?: string; // Optional, defaults to now
}

export async function addTimelineEvent(params: AddTimelineEventParams): Promise<IncidentMemory> {
  const memory = await loadMemory(params.incident_id);
  if (!memory) {
    throw new Error(`Incident ${params.incident_id} not found`);
  }

  const newEvent: TimelineEvent = {
    timestamp: params.timestamp ?? utcNow(),
    event: params.event,
    source: params.source,
    details: params.details,
  };

  memory.timeline.push(newEvent);
  memory.timeline.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  await saveMemory(memory);
  return memory;
}

// --- Hypothesis Operations ---

export interface ProposeHypothesisParams {
  incident_id: string;
  title: string;
  proposed_by: "agent" | "user";
  initial_evidence: string[];
  confidence: Confidence;
}

export async function proposeHypothesis(params: ProposeHypothesisParams): Promise<IncidentMemory> {
  const memory = await loadMemory(params.incident_id);
  if (!memory) {
    throw new Error(`Incident ${params.incident_id} not found`);
  }

  const hypothesis: Hypothesis = {
    id: generateHypothesisId(memory),
    title: params.title,
    proposed_at: utcNow(),
    proposed_by: params.proposed_by,
    status: "investigating",
    confidence: params.confidence,
    supporting_evidence: params.initial_evidence,
    counter_evidence: [],
  };

  memory.hypotheses.push(hypothesis);
  await saveMemory(memory);
  return memory;
}

export interface UpdateHypothesisParams {
  incident_id: string;
  hypothesis_id: string;
  add_supporting_evidence?: string[];
  add_counter_evidence?: string[];
  new_confidence?: Confidence;
}

export async function updateHypothesis(params: UpdateHypothesisParams): Promise<IncidentMemory> {
  const memory = await loadMemory(params.incident_id);
  if (!memory) {
    throw new Error(`Incident ${params.incident_id} not found`);
  }

  const hypothesis = memory.hypotheses.find((h) => h.id === params.hypothesis_id);
  if (!hypothesis) {
    throw new Error(`Hypothesis ${params.hypothesis_id} not found`);
  }

  if (params.add_supporting_evidence) {
    hypothesis.supporting_evidence.push(...params.add_supporting_evidence);
  }
  if (params.add_counter_evidence) {
    hypothesis.counter_evidence.push(...params.add_counter_evidence);
  }
  if (params.new_confidence) {
    hypothesis.confidence = params.new_confidence;
  }

  await saveMemory(memory);
  return memory;
}

export interface RuleOutHypothesisParams {
  incident_id: string;
  hypothesis_id: string;
  reason: string;
}

export async function ruleOutHypothesis(params: RuleOutHypothesisParams): Promise<IncidentMemory> {
  const memory = await loadMemory(params.incident_id);
  if (!memory) {
    throw new Error(`Incident ${params.incident_id} not found`);
  }

  const hypothesis = memory.hypotheses.find((h) => h.id === params.hypothesis_id);
  if (!hypothesis) {
    throw new Error(`Hypothesis ${params.hypothesis_id} not found`);
  }

  const now = utcNow();
  hypothesis.status = "ruled_out";
  hypothesis.ruled_out_at = now;

  memory.ruled_out.push({
    hypothesis: hypothesis.title,
    reason: params.reason,
    ruled_out_at: now,
  });

  await saveMemory(memory);
  return memory;
}

export interface ConfirmRootCauseParams {
  incident_id: string;
  hypothesis_id: string;
}

export async function confirmRootCause(params: ConfirmRootCauseParams): Promise<IncidentMemory> {
  const memory = await loadMemory(params.incident_id);
  if (!memory) {
    throw new Error(`Incident ${params.incident_id} not found`);
  }

  const hypothesis = memory.hypotheses.find((h) => h.id === params.hypothesis_id);
  if (!hypothesis) {
    throw new Error(`Hypothesis ${params.hypothesis_id} not found`);
  }

  hypothesis.status = "confirmed_root_cause";
  memory.metadata.status = "resolved";

  // Update TLDR
  memory.tldr.summary = `Root cause confirmed: ${hypothesis.title}`;
  memory.tldr.last_updated = utcNow();

  // Add timeline event
  memory.timeline.push({
    timestamp: utcNow(),
    event: "Root cause confirmed",
    source: "user",
    details: hypothesis.title,
  });

  await saveMemory(memory);
  return memory;
}

// --- Finding Operations ---

export interface AddFindingParams {
  incident_id: string;
  type: FindingType;
  description: string;
  service: string;
  timestamp: string;
  value?: string;
}

export async function addFinding(params: AddFindingParams): Promise<IncidentMemory> {
  const memory = await loadMemory(params.incident_id);
  if (!memory) {
    throw new Error(`Incident ${params.incident_id} not found`);
  }

  const finding: Finding = {
    type: params.type,
    description: params.description,
    service: params.service,
    timestamp: params.timestamp,
    value: params.value,
  };

  memory.findings.push(finding);
  await saveMemory(memory);
  return memory;
}

// --- TLDR Operations ---

export interface UpdateTLDRParams {
  incident_id: string;
  summary: string;
}

export async function updateTLDR(params: UpdateTLDRParams): Promise<IncidentMemory> {
  const memory = await loadMemory(params.incident_id);
  if (!memory) {
    throw new Error(`Incident ${params.incident_id} not found`);
  }

  memory.tldr.summary = params.summary;
  memory.tldr.last_updated = utcNow();

  await saveMemory(memory);
  return memory;
}

// --- Read Operations ---

export async function getIncident(incidentId: string): Promise<IncidentMemory | null> {
  return loadMemory(incidentId);
}

export async function getHypotheses(incidentId: string): Promise<Hypothesis[]> {
  const memory = await loadMemory(incidentId);
  if (!memory) {
    throw new Error(`Incident ${incidentId} not found`);
  }
  return memory.hypotheses;
}

export async function getTimeline(incidentId: string): Promise<TimelineEvent[]> {
  const memory = await loadMemory(incidentId);
  if (!memory) {
    throw new Error(`Incident ${incidentId} not found`);
  }
  return memory.timeline;
}
