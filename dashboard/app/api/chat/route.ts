import { streamText, stepCountIs, convertToModelMessages } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { SYSTEM_PROMPT } from "@shared/agent/prompt";
import { memoryTools } from "@/lib/tools";
import { loadMcpTools } from "@/lib/mcp-tools";
import { loadMemory } from "@shared/memory/storage";

export const maxDuration = 120;

export async function POST(req: Request) {
  const { messages, incidentId } = await req.json();

  const mcpTools = await loadMcpTools();

  let systemPrompt = SYSTEM_PROMPT;

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
    tools: { ...memoryTools, ...mcpTools },
    stopWhen: stepCountIs(20),
  });

  return result.toUIMessageStreamResponse();
}
