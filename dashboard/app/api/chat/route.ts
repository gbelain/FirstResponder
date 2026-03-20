import { streamText, stepCountIs, convertToModelMessages } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { SYSTEM_PROMPT } from "@/utils/agent/prompt";
import { createMemoryTools } from "@/utils/tools";
import { createGcpTools } from "@/utils/gcp-tools";
import { loadMemory } from "@/utils/memory/storage";
import { updateActiveInvestigator } from "@/utils/memory/operations";

export const maxDuration = 120;

export async function POST(req: Request) {
  const { messages, incidentId, userName } = await req.json();

  const resolvedName: string = userName || "anonymous";

  // Update active investigators tracking (fire-and-forget)
  if (incidentId && incidentId !== "new") {
    updateActiveInvestigator(incidentId, resolvedName).catch(() => {});
  }

  const gcpTools = createGcpTools();
  const userTools = createMemoryTools(resolvedName);

  let systemPrompt = SYSTEM_PROMPT;

  // Inject user identity + multi-user awareness
  systemPrompt += `\n\n## Current Investigator\nYou are chatting with **${resolvedName}**. When creating incidents, adding findings, or proposing hypotheses, use "${resolvedName}" as the investigator/attribution name. When the agent itself proposes a hypothesis, use "agent" as the proposed_by value.`;

  systemPrompt += `\n\n## Multi-User Awareness\nOther investigators may be working on this incident simultaneously in separate chat sessions. The incident memory (findings, hypotheses, timeline) is shared across all sessions. Before making GCP queries, call get_incident to check if another investigator already found the answer. When proposing hypotheses, check if a similar hypothesis already exists. Reference other investigators' findings when relevant.`;

  // If resuming an existing incident, inject its state as context
  if (incidentId && incidentId !== "new") {
    const memory = await loadMemory(incidentId);
    if (memory) {
      systemPrompt += `\n\n## Active Investigation Context\n\nYou are resuming an existing investigation. Here is the current state:\n\n\`\`\`json\n${JSON.stringify(memory, null, 2)}\n\`\`\`\n\nDo NOT run the onboarding flow. The user is already investigating this incident. Start by acknowledging the current state briefly and ask how you can help continue the investigation.`;
    }
  }

  const result = streamText({
    model: anthropic("claude-sonnet-4-5-20250929"),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    tools: { ...userTools, ...gcpTools },
    stopWhen: stepCountIs(20),
  });

  return result.toUIMessageStreamResponse();
}
