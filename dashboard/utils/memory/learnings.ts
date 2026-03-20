/**
 * Investigation learnings — saves and retrieves knowledge from Agent Studio memory.
 *
 * Episodic memories: OTAR reasoning chains from investigation steps.
 * Semantic memories: distilled facts from resolved incidents, ruled-out hypotheses, false alarms.
 */

import { saveSemantic, saveEpisodic, searchMemories } from "./api-client";
import type { Hypothesis } from "@/types/memory";

// --- Helpers ---

function baseKeywords(incidentId: string, services: string[]): string[] {
  return [incidentId, "firstresponder", ...services];
}

function isMemoryApiConfigured(): boolean {
  return !!(process.env.MEMORY_API_APP_ID && process.env.MEMORY_API_KEY);
}

async function safeSave(label: string, fn: () => Promise<unknown>): Promise<void> {
  if (!isMemoryApiConfigured()) return;
  try {
    await fn();
  } catch (error) {
    // Fire-and-forget: learning saves should never break the investigation
    console.error(`[learnings] Failed to save ${label}:`, error);
  }
}

// --- Save learnings ---

/**
 * Save an episodic memory capturing an investigation reasoning step.
 * Called when the agent discovers something significant during log analysis.
 */
export async function saveInvestigationStep(
  incidentId: string,
  services: string[],
  observation: string,
  thoughts: string,
  action: string,
  result: string,
): Promise<void> {
  await safeSave("investigation step", () =>
    saveEpisodic({
      text: `Investigation step for ${incidentId}: ${observation}`,
      raw_extract: `Observation: ${observation}\nThoughts: ${thoughts}\nAction: ${action}\nResult: ${result}`,
      observation,
      thoughts,
      action,
      result,
      keywords: [...baseKeywords(incidentId, services), "investigation-step"],
      topics: ["technical"],
      recall_triggers: [observation, result],
      agent_ids: ["*"],
      wait: false,
    }),
  );
}

/**
 * Save a semantic memory when a root cause is confirmed.
 * Captures the distilled learning for future investigations.
 */
export async function saveRootCauseLearning(
  incidentId: string,
  hypothesis: Hypothesis,
  affectedServices: string[],
): Promise<void> {
  const evidenceSummary = hypothesis.supporting_evidence.join("; ");

  await safeSave("root cause learning", () =>
    saveSemantic({
      text: `Root cause confirmed for ${incidentId}: ${hypothesis.title}. Evidence: ${evidenceSummary}`,
      raw_extract: JSON.stringify({
        incident_id: incidentId,
        root_cause: hypothesis.title,
        services: affectedServices,
        supporting_evidence: hypothesis.supporting_evidence,
        counter_evidence: hypothesis.counter_evidence,
        confirmed_at: new Date().toISOString(),
      }),
      keywords: [...baseKeywords(incidentId, affectedServices), "root-cause", "confirmed"],
      topics: ["technical"],
      recall_triggers: [hypothesis.title, ...affectedServices],
      agent_ids: ["*"],
      wait: false,
    }),
  );
}

/**
 * Save an episodic memory when a hypothesis is ruled out.
 * Captures why it looked plausible but wasn't — prevents repeating the same mistake.
 */
export async function saveRuledOutLearning(
  incidentId: string,
  hypothesis: Hypothesis,
  reason: string,
  affectedServices: string[],
): Promise<void> {
  await safeSave("ruled-out learning", () =>
    saveEpisodic({
      text: `Hypothesis ruled out for ${incidentId}: ${hypothesis.title}`,
      raw_extract: JSON.stringify({
        incident_id: incidentId,
        hypothesis: hypothesis.title,
        reason,
        supporting_evidence: hypothesis.supporting_evidence,
        counter_evidence: hypothesis.counter_evidence,
      }),
      observation: `Hypothesis "${hypothesis.title}" proposed based on: ${hypothesis.supporting_evidence.join("; ")}`,
      thoughts: `Initially seemed plausible (confidence: ${hypothesis.confidence}) but counter-evidence emerged`,
      action: `Investigated further and found: ${hypothesis.counter_evidence.join("; ")}`,
      result: `Ruled out: ${reason}`,
      keywords: [...baseKeywords(incidentId, affectedServices), "ruled-out", "hypothesis"],
      topics: ["technical"],
      recall_triggers: [hypothesis.title, ...affectedServices],
      agent_ids: ["*"],
      wait: false,
    }),
  );
}

/**
 * Save a semantic memory for false alarms.
 * Helps the agent recognize benign patterns in future investigations.
 */
export async function saveFalseAlarmLearning(
  incidentId: string,
  description: string,
  affectedServices: string[],
): Promise<void> {
  await safeSave("false alarm learning", () =>
    saveSemantic({
      text: `False alarm for ${incidentId}: ${description}`,
      raw_extract: JSON.stringify({
        incident_id: incidentId,
        description,
        services: affectedServices,
        recorded_at: new Date().toISOString(),
      }),
      keywords: [...baseKeywords(incidentId, affectedServices), "false-alarm", "benign"],
      topics: ["technical"],
      recall_triggers: [description, ...affectedServices],
      agent_ids: ["*"],
      wait: false,
    }),
  );
}

// --- Pull learnings ---

/**
 * Search past investigation learnings for relevant context.
 * Returns a formatted string to include in agent context, or null if nothing found.
 */
export async function searchPastLearnings(
  query: string,
  services?: string[],
): Promise<string | null> {
  if (!isMemoryApiConfigured()) return null;

  try {
    const result = await searchMemories({
      queries: [query],
      keywords: services ? ["firstresponder", ...services] : ["firstresponder"],
      topics: ["technical"],
      limit: 5,
    });

    if (result.hits.length === 0) return null;

    const formatted = result.hits.map((hit, i) => {
      const prefix = hit.memoryType === "episodic" ? "Past investigation step" : "Past learning";
      const lines = [`${i + 1}. [${prefix}] ${hit.text}`];

      if (hit.episode) {
        lines.push(`   Observation: ${hit.episode.observation}`);
        lines.push(`   Result: ${hit.episode.result}`);
      }

      return lines.join("\n");
    });

    return formatted.join("\n\n");
  } catch (error) {
    console.error("[learnings] Failed to search past learnings:", error);
    return null;
  }
}
