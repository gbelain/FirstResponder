/**
 * Agent tool definitions for memory operations
 * Compatible with Anthropic SDK tool format
 */

import type { Tool } from "@anthropic-ai/sdk/resources/messages.js";
import {
  createIncident,
  addTimelineEvent,
  proposeHypothesis,
  updateHypothesis,
  ruleOutHypothesis,
  confirmRootCause,
  addFinding,
  updateTLDR,
  getIncident,
  getHypotheses,
  getTimeline,
} from "../memory/operations.js";
import { listIncidents } from "../memory/storage.js";

export const memoryTools: Tool[] = [
  {
    name: "create_incident",
    description:
      "Create a new incident investigation. Use this when starting a new investigation. Returns the full incident memory object.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "Short descriptive name for the incident (e.g., 'Checkout 500 Errors')",
        },
        severity: {
          type: "string",
          enum: ["critical", "high", "medium", "low"],
          description: "Incident severity level",
        },
        affected_services: {
          type: "array",
          items: { type: "string" },
          description: "List of affected service names",
        },
        investigator: {
          type: "string",
          description: "Email or name of the person leading the investigation",
        },
        initial_description: {
          type: "string",
          description: "Initial description of the problem from the user",
        },
      },
      required: ["name", "severity", "affected_services", "investigator", "initial_description"],
    },
  },
  {
    name: "get_incident",
    description:
      "Retrieve the full incident memory. Use this to check current investigation state before taking actions or making queries.",
    input_schema: {
      type: "object" as const,
      properties: {
        incident_id: {
          type: "string",
          description: "The incident ID to retrieve",
        },
      },
      required: ["incident_id"],
    },
  },
  {
    name: "list_incidents",
    description: "List all existing incident IDs. Use this to find incidents to resume.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "add_timeline_event",
    description:
      "Add an event to the investigation timeline. Use this after discovering significant information from logs or user input.",
    input_schema: {
      type: "object" as const,
      properties: {
        incident_id: {
          type: "string",
          description: "The incident ID",
        },
        event: {
          type: "string",
          description: "Short event title (e.g., 'Error spike detected')",
        },
        source: {
          type: "string",
          enum: ["logs", "user", "agent", "metrics"],
          description: "Source of this information",
        },
        details: {
          type: "string",
          description: "Detailed description of the event or finding",
        },
        timestamp: {
          type: "string",
          description: "ISO 8601 UTC timestamp. If omitted, uses current time.",
        },
      },
      required: ["incident_id", "event", "source", "details"],
    },
  },
  {
    name: "propose_hypothesis",
    description:
      "Propose a new hypothesis for the root cause. Include initial evidence and confidence level.",
    input_schema: {
      type: "object" as const,
      properties: {
        incident_id: {
          type: "string",
          description: "The incident ID",
        },
        title: {
          type: "string",
          description: "Clear, specific hypothesis title (e.g., 'Redis connection pool exhaustion')",
        },
        proposed_by: {
          type: "string",
          enum: ["agent", "user"],
          description: "Who proposed this hypothesis",
        },
        initial_evidence: {
          type: "array",
          items: { type: "string" },
          description: "Initial evidence supporting this hypothesis",
        },
        confidence: {
          type: "string",
          enum: ["high", "medium", "low"],
          description: "Current confidence level based on available evidence",
        },
      },
      required: ["incident_id", "title", "proposed_by", "initial_evidence", "confidence"],
    },
  },
  {
    name: "update_hypothesis",
    description:
      "Update an existing hypothesis with new evidence, counter-evidence, or confidence level.",
    input_schema: {
      type: "object" as const,
      properties: {
        incident_id: {
          type: "string",
          description: "The incident ID",
        },
        hypothesis_id: {
          type: "string",
          description: "The hypothesis ID (e.g., 'hyp_1')",
        },
        add_supporting_evidence: {
          type: "array",
          items: { type: "string" },
          description: "New evidence supporting the hypothesis",
        },
        add_counter_evidence: {
          type: "array",
          items: { type: "string" },
          description: "New evidence against the hypothesis",
        },
        new_confidence: {
          type: "string",
          enum: ["high", "medium", "low"],
          description: "Updated confidence level",
        },
      },
      required: ["incident_id", "hypothesis_id"],
    },
  },
  {
    name: "rule_out_hypothesis",
    description:
      "Mark a hypothesis as ruled out with the reason. Use when evidence clearly contradicts the hypothesis.",
    input_schema: {
      type: "object" as const,
      properties: {
        incident_id: {
          type: "string",
          description: "The incident ID",
        },
        hypothesis_id: {
          type: "string",
          description: "The hypothesis ID to rule out",
        },
        reason: {
          type: "string",
          description: "Clear explanation of why this hypothesis was ruled out",
        },
      },
      required: ["incident_id", "hypothesis_id", "reason"],
    },
  },
  {
    name: "confirm_root_cause",
    description:
      "Mark a hypothesis as the confirmed root cause. IMPORTANT: Only use this after receiving explicit user confirmation.",
    input_schema: {
      type: "object" as const,
      properties: {
        incident_id: {
          type: "string",
          description: "The incident ID",
        },
        hypothesis_id: {
          type: "string",
          description: "The hypothesis ID to confirm as root cause",
        },
      },
      required: ["incident_id", "hypothesis_id"],
    },
  },
  {
    name: "add_finding",
    description: "Record a significant finding discovered during investigation (error, metric anomaly, or config change).",
    input_schema: {
      type: "object" as const,
      properties: {
        incident_id: {
          type: "string",
          description: "The incident ID",
        },
        type: {
          type: "string",
          enum: ["error", "metric", "config_change"],
          description: "Type of finding",
        },
        description: {
          type: "string",
          description: "Description of the finding (e.g., 'Connection timeout to redis-cache-prod')",
        },
        service: {
          type: "string",
          description: "Service where the finding was observed",
        },
        timestamp: {
          type: "string",
          description: "ISO 8601 UTC timestamp of when this was observed",
        },
        value: {
          type: "string",
          description: "Optional additional value (e.g., '847 occurrences', 'spike from 150 to 2400')",
        },
      },
      required: ["incident_id", "type", "description", "service", "timestamp"],
    },
  },
  {
    name: "update_tldr",
    description:
      "Update the TLDR summary of the investigation. Use this to keep the summary current with latest findings.",
    input_schema: {
      type: "object" as const,
      properties: {
        incident_id: {
          type: "string",
          description: "The incident ID",
        },
        summary: {
          type: "string",
          description: "Updated summary of current investigation state",
        },
      },
      required: ["incident_id", "summary"],
    },
  },
  {
    name: "get_hypotheses",
    description: "Get all hypotheses for an incident. Useful for reviewing current theories.",
    input_schema: {
      type: "object" as const,
      properties: {
        incident_id: {
          type: "string",
          description: "The incident ID",
        },
      },
      required: ["incident_id"],
    },
  },
  {
    name: "get_timeline",
    description: "Get the full timeline for an incident. Useful for reviewing investigation history.",
    input_schema: {
      type: "object" as const,
      properties: {
        incident_id: {
          type: "string",
          description: "The incident ID",
        },
      },
      required: ["incident_id"],
    },
  },
];

// Tool execution handler
export async function executeMemoryTool(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<unknown> {
  switch (toolName) {
    case "create_incident":
      return createIncident({
        name: toolInput.name as string,
        severity: toolInput.severity as "critical" | "high" | "medium" | "low",
        affected_services: toolInput.affected_services as string[],
        investigator: toolInput.investigator as string,
        initial_description: toolInput.initial_description as string,
      });

    case "get_incident":
      return getIncident(toolInput.incident_id as string);

    case "list_incidents":
      return listIncidents();

    case "add_timeline_event":
      return addTimelineEvent({
        incident_id: toolInput.incident_id as string,
        event: toolInput.event as string,
        source: toolInput.source as "logs" | "user" | "agent" | "metrics",
        details: toolInput.details as string,
        timestamp: toolInput.timestamp as string | undefined,
      });

    case "propose_hypothesis":
      return proposeHypothesis({
        incident_id: toolInput.incident_id as string,
        title: toolInput.title as string,
        proposed_by: toolInput.proposed_by as "agent" | "user",
        initial_evidence: toolInput.initial_evidence as string[],
        confidence: toolInput.confidence as "high" | "medium" | "low",
      });

    case "update_hypothesis":
      return updateHypothesis({
        incident_id: toolInput.incident_id as string,
        hypothesis_id: toolInput.hypothesis_id as string,
        add_supporting_evidence: toolInput.add_supporting_evidence as string[] | undefined,
        add_counter_evidence: toolInput.add_counter_evidence as string[] | undefined,
        new_confidence: toolInput.new_confidence as "high" | "medium" | "low" | undefined,
      });

    case "rule_out_hypothesis":
      return ruleOutHypothesis({
        incident_id: toolInput.incident_id as string,
        hypothesis_id: toolInput.hypothesis_id as string,
        reason: toolInput.reason as string,
      });

    case "confirm_root_cause":
      return confirmRootCause({
        incident_id: toolInput.incident_id as string,
        hypothesis_id: toolInput.hypothesis_id as string,
      });

    case "add_finding":
      return addFinding({
        incident_id: toolInput.incident_id as string,
        type: toolInput.type as "error" | "metric" | "config_change",
        description: toolInput.description as string,
        service: toolInput.service as string,
        timestamp: toolInput.timestamp as string,
        value: toolInput.value as string | undefined,
      });

    case "update_tldr":
      return updateTLDR({
        incident_id: toolInput.incident_id as string,
        summary: toolInput.summary as string,
      });

    case "get_hypotheses":
      return getHypotheses(toolInput.incident_id as string);

    case "get_timeline":
      return getTimeline(toolInput.incident_id as string);

    default:
      throw new Error(`Unknown memory tool: ${toolName}`);
  }
}
