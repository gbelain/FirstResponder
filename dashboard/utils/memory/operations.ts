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
} from "@/types/memory";
import {
  loadMemory,
  saveMemory,
  partialUpdate,
  loadMemoryWithVersion,
  saveMemoryVersioned,
} from "./storage";
import { saveRootCauseLearning, saveRuledOutLearning } from "./learnings";

function utcNow(): string {
  return new Date().toISOString();
}

function generateIncidentId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `inc_${timestamp}_${random}`;
}

function generateHypothesisId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `hyp_${timestamp}_${random}`;
}

// --- Optimistic Lock Helper ---

async function withOptimisticLock(
  incidentId: string,
  mutateFn: (memory: IncidentMemory) => void,
  maxRetries = 3
): Promise<IncidentMemory> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await loadMemoryWithVersion(incidentId);
    if (!result) {
      throw new Error(`Incident ${incidentId} not found`);
    }

    const { memory, version } = result;
    mutateFn(memory);

    const saveResult = await saveMemoryVersioned(memory, version);
    if (saveResult.success) {
      return memory;
    }
    // Version conflict — retry
  }
  throw new Error(
    `Failed to save incident ${incidentId} after ${maxRetries} retries (version conflict)`
  );
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
      investigators: [params.investigator],
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
        reported_by: params.investigator,
      },
    ],
    hypotheses: [],
    findings: [],
    _version: 1,
    active_investigators: [],
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
  reported_by?: string;
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
    reported_by: params.reported_by,
  };

  memory.timeline.push(newEvent);
  memory.timeline.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  await partialUpdate(params.incident_id, { timeline: memory.timeline });
  return memory;
}

// --- Hypothesis Operations ---

export interface ProposeHypothesisParams {
  incident_id: string;
  title: string;
  proposed_by: string;
  initial_evidence: string[];
  confidence: Confidence;
}

export async function proposeHypothesis(params: ProposeHypothesisParams): Promise<IncidentMemory> {
  const memory = await loadMemory(params.incident_id);
  if (!memory) {
    throw new Error(`Incident ${params.incident_id} not found`);
  }

  const hypothesis: Hypothesis = {
    id: generateHypothesisId(),
    title: params.title,
    proposed_at: utcNow(),
    proposed_by: params.proposed_by,
    status: "investigating",
    confidence: params.confidence,
    supporting_evidence: params.initial_evidence,
    counter_evidence: [],
  };

  memory.hypotheses.push(hypothesis);
  await partialUpdate(params.incident_id, { hypotheses: memory.hypotheses });
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
  return withOptimisticLock(params.incident_id, (memory) => {
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
  });
}

export interface RuleOutHypothesisParams {
  incident_id: string;
  hypothesis_id: string;
  reason: string;
}

export async function ruleOutHypothesis(params: RuleOutHypothesisParams): Promise<IncidentMemory> {
  const memory = await withOptimisticLock(params.incident_id, (m) => {
    const hypothesis = m.hypotheses.find((h) => h.id === params.hypothesis_id);
    if (!hypothesis) {
      throw new Error(`Hypothesis ${params.hypothesis_id} not found`);
    }

    const now = utcNow();
    hypothesis.status = "ruled_out";
    hypothesis.ruled_out_at = now;
    hypothesis.ruled_out_reason = params.reason;
  });

  // Fire-and-forget: save learning to Agent Studio memory
  const hypothesis = memory.hypotheses.find((h) => h.id === params.hypothesis_id)!;
  saveRuledOutLearning(params.incident_id, hypothesis, params.reason, memory.metadata.affected_services);

  return memory;
}

export interface ConfirmRootCauseParams {
  incident_id: string;
  hypothesis_id: string;
}

export async function confirmRootCause(params: ConfirmRootCauseParams): Promise<IncidentMemory> {
  const memory = await withOptimisticLock(params.incident_id, (m) => {
    const hypothesis = m.hypotheses.find((h) => h.id === params.hypothesis_id);
    if (!hypothesis) {
      throw new Error(`Hypothesis ${params.hypothesis_id} not found`);
    }

    hypothesis.status = "confirmed_root_cause";
    m.metadata.status = "resolved";

    // Update TLDR
    m.tldr.summary = `Root cause confirmed: ${hypothesis.title}`;
    m.tldr.last_updated = utcNow();

    // Add timeline event
    m.timeline.push({
      timestamp: utcNow(),
      event: "Root cause confirmed",
      source: "user",
      details: hypothesis.title,
    });
  });

  // Fire-and-forget: save learning to Agent Studio memory
  const hypothesis = memory.hypotheses.find((h) => h.id === params.hypothesis_id)!;
  saveRootCauseLearning(params.incident_id, hypothesis, memory.metadata.affected_services);

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
  discovered_by?: string;
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
    discovered_by: params.discovered_by,
  };

  memory.findings.push(finding);
  await partialUpdate(params.incident_id, { findings: memory.findings });
  return memory;
}

// --- TLDR Operations ---

export interface UpdateTLDRParams {
  incident_id: string;
  summary: string;
}

export async function updateTLDR(params: UpdateTLDRParams): Promise<IncidentMemory> {
  return withOptimisticLock(params.incident_id, (memory) => {
    memory.tldr.summary = params.summary;
    memory.tldr.last_updated = utcNow();
  });
}

// --- Active Investigator Tracking ---

export async function updateActiveInvestigator(
  incidentId: string,
  name: string
): Promise<void> {
  const memory = await loadMemory(incidentId);
  if (!memory) return;

  // Update active investigators list
  const now = utcNow();
  const active = memory.active_investigators.filter((inv) => inv.name !== name);
  active.push({ name, last_seen: now });

  // Ensure this name is in metadata.investigators
  const investigators = memory.metadata.investigators.includes(name)
    ? memory.metadata.investigators
    : [...memory.metadata.investigators, name];

  await partialUpdate(incidentId, {
    active_investigators: active,
    metadata: { ...memory.metadata, investigators },
  });
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
