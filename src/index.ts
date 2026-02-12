/**
 * FirstResponder CLI — interactive incident investigation
 */

import { createInterface } from "node:readline";
import type { AgentEventHandlers } from "./agent/index.js";
import { initAgent, sendMessage, shutdownAgent } from "./agent/index.js";

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(): Promise<string> {
  return new Promise((resolve) => {
    rl.question("\nyou> ", (answer) => {
      resolve(answer.trim());
    });
  });
}

/** Event handlers that give real-time visibility into agent activity. */
const agentEvents: AgentEventHandlers = {
  onText(text) {
    process.stdout.write(text);
  },

  onToolStart(name, input) {
    const inputPreview = JSON.stringify(input).slice(0, 120);
    process.stdout.write(`\n  [tool] ${name}(${inputPreview})...`);
  },

  onToolEnd(_name, _result, isError) {
    console.log(isError ? " ERROR" : " ok");
  },
};

async function main(): Promise<void> {
  console.log("FirstResponder v0.1.0");
  console.log("AI-powered incident response agent\n");
  console.log("Commands:");
  console.log("  exit / quit  — shut down the agent");
  console.log("  Ctrl+C       — force quit\n");

  try {
    console.log("Initializing agent (connecting to MCP server)...");
    const { memoryToolCount, mcpToolCount } = await initAgent();
    console.log(
      `Ready — ${memoryToolCount} memory tools + ${mcpToolCount} MCP tools loaded.\n`
    );

    while (true) {
      const userInput = await prompt();

      if (!userInput) continue;
      if (
        userInput.toLowerCase() === "exit" ||
        userInput.toLowerCase() === "quit"
      ) {
        console.log("Shutting down...");
        break;
      }

      try {
        process.stdout.write("\nfirst-responder> ");
        await sendMessage(userInput, agentEvents);
        // Ensure we end on a newline after streaming output
        process.stdout.write("\n");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        console.error(`\nError: ${message}`);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Fatal error: ${message}`);
    process.exit(1);
  } finally {
    await shutdownAgent();
    rl.close();
  }
}

main();
