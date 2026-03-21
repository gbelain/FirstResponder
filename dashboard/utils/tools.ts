import { tool } from "ai";
import { z } from "zod";
import fs from "fs";
import path from "path";
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
} from "@/utils/memory/operations";
import { listIncidents } from "@/utils/memory/storage";

export function createMemoryTools(userName: string) {
  return {
    create_incident: tool({
      description:
        "Create a new incident investigation. Use this when starting a new investigation. Returns the full incident memory object.",
      inputSchema: z.object({
        name: z.string().describe("Short descriptive name for the incident"),
        severity: z.enum(["critical", "high", "medium", "low"]),
        affected_services: z.array(z.string()).describe("List of affected service names"),
        initial_description: z.string().describe("Initial description of the problem"),
      }),
      execute: async (input) => {
        const result = await createIncident({
          ...input,
          investigator: userName,
        });
        return result;
      },
    }),

    get_incident: tool({
      description:
        "Retrieve the full incident memory. Use this to check current investigation state before taking actions.",
      inputSchema: z.object({
        incident_id: z.string(),
      }),
      execute: async ({ incident_id }) => {
        return await getIncident(incident_id);
      },
    }),

    list_incidents: tool({
      description: "List all existing incident IDs.",
      inputSchema: z.object({}),
      execute: async () => {
        return await listIncidents();
      },
    }),

    add_timeline_event: tool({
      description:
        "Add an event to the investigation timeline. Use after discovering significant information.",
      inputSchema: z.object({
        incident_id: z.string(),
        event: z.string().describe("Short event title"),
        source: z.enum(["logs", "user", "agent", "metrics"]),
        details: z.string().describe("Detailed description of the event"),
        timestamp: z.string().optional().describe("ISO 8601 UTC timestamp, defaults to now"),
      }),
      execute: async (input) => {
        return await addTimelineEvent({
          ...input,
          reported_by: userName,
        });
      },
    }),

    propose_hypothesis: tool({
      description: "Propose a new hypothesis for the root cause with initial evidence and confidence.",
      inputSchema: z.object({
        incident_id: z.string(),
        title: z.string().describe("Clear, specific hypothesis title"),
        proposed_by: z.string().describe("Who proposed this hypothesis (investigator name or 'agent')"),
        initial_evidence: z.array(z.string()),
        confidence: z.enum(["high", "medium", "low"]),
      }),
      execute: async (input) => {
        return await proposeHypothesis(input);
      },
    }),

    update_hypothesis: tool({
      description: "Update an existing hypothesis with new evidence or confidence level.",
      inputSchema: z.object({
        incident_id: z.string(),
        hypothesis_id: z.string(),
        add_supporting_evidence: z.array(z.string()).optional(),
        add_counter_evidence: z.array(z.string()).optional(),
        new_confidence: z.enum(["high", "medium", "low"]).optional(),
      }),
      execute: async (input) => {
        return await updateHypothesis(input);
      },
    }),

    rule_out_hypothesis: tool({
      description: "Mark a hypothesis as ruled out with reasoning.",
      inputSchema: z.object({
        incident_id: z.string(),
        hypothesis_id: z.string(),
        reason: z.string().describe("Why this hypothesis was ruled out"),
      }),
      execute: async (input) => {
        return await ruleOutHypothesis(input);
      },
    }),

    confirm_root_cause: tool({
      description:
        "Mark a hypothesis as confirmed root cause. Only use after explicit user confirmation.",
      inputSchema: z.object({
        incident_id: z.string(),
        hypothesis_id: z.string(),
      }),
      execute: async (input) => {
        return await confirmRootCause(input);
      },
    }),

    add_finding: tool({
      description: "Record a significant finding (error, metric anomaly, or config change).",
      inputSchema: z.object({
        incident_id: z.string(),
        type: z.enum(["error", "metric", "config_change"]),
        description: z.string(),
        service: z.string(),
        timestamp: z.string().describe("ISO 8601 UTC timestamp"),
        value: z.string().optional(),
      }),
      execute: async (input) => {
        return await addFinding({
          ...input,
          discovered_by: userName,
        });
      },
    }),

    update_tldr: tool({
      description: "Update the TLDR summary of the investigation.",
      inputSchema: z.object({
        incident_id: z.string(),
        summary: z.string(),
      }),
      execute: async (input) => {
        return await updateTLDR(input);
      },
    }),

    get_hypotheses: tool({
      description: "Get all hypotheses for an incident.",
      inputSchema: z.object({
        incident_id: z.string(),
      }),
      execute: async ({ incident_id }) => {
        return await getHypotheses(incident_id);
      },
    }),

    get_timeline: tool({
      description: "Get the full timeline for an incident.",
      inputSchema: z.object({
        incident_id: z.string(),
      }),
      execute: async ({ incident_id }) => {
        return await getTimeline(incident_id);
      },
    }),

    get_postmortem_guidelines: tool({
      description:
        "Retrieve post-mortem writing guidelines and full incident data. Call this before writing a post-mortem to get the skill prompt and all investigation context needed.",
      inputSchema: z.object({
        incident_id: z.string(),
      }),
      execute: async ({ incident_id }) => {
        const skillPath = path.join(
          process.cwd(),
          "utils/agent/skills/postmortem-writer.md"
        );
        const guidelines = fs.readFileSync(skillPath, "utf-8");
        const incident = await getIncident(incident_id);
        return { guidelines, incident };
      },
    }),

    save_postmortem: tool({
      description:
        "Save the generated post-mortem markdown. Call this after writing the post-mortem content. The file will be downloaded to the user's machine.",
      inputSchema: z.object({
        incident_id: z.string(),
        incident_name: z.string().describe("Incident name for the filename"),
        content: z.string().describe("The full post-mortem markdown content"),
      }),
      execute: async ({ incident_id, incident_name, content }) => {
        const slug = incident_name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        const filename = `postmortem-${slug}-${incident_id}.md`;
        return { filename, content };
      },
    }),
  };
}
