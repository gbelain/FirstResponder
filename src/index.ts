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

/** Tool output verbosity: "minimal" shows name + ok/error, "full" shows input + result */
type ToolVerbosity = "minimal" | "full";
let toolVerbosity: ToolVerbosity = "minimal";

function createAgentEvents(): AgentEventHandlers {
  return {
    onText(text) {
      process.stdout.write(text);
    },

    onToolStart(name, input) {
      if (toolVerbosity === "full") {
        const inputStr = JSON.stringify(input, null, 2);
        process.stdout.write(`\n  [tool] ${name}\n  input: ${inputStr}\n  ...`);
      } else {
        process.stdout.write(`\n  [tool] ${name}...`);
      }
    },

    onToolEnd(_name, result, isError) {
      if (toolVerbosity === "full") {
        const resultStr = typeof result === "string" ? result : JSON.stringify(result, null, 2);
        const preview = resultStr.length > 500 ? resultStr.slice(0, 500) + "... (truncated)" : resultStr;
        console.log(isError ? ` ERROR\n  ${preview}` : ` ok\n  result: ${preview}`);
      } else {
        console.log(isError ? " ERROR" : " ok");
      }
    },
  };
}

async function main(): Promise<void> {
  console.log("FirstResponder v0.1.0");
  console.log("AI-powered incident response agent\n");
  console.log("Commands:");
  console.log("  /tools       — toggle tool output (minimal / full)");
  console.log("  exit / quit  — shut down the agent");
  console.log("  Ctrl+C       — force quit\n");

  try {
    console.log("Initializing agent (connecting to MCP server)...");
    const { memoryToolCount, mcpToolCount } = await initAgent();
    console.log(
      `Ready — ${memoryToolCount} memory tools + ${mcpToolCount} MCP tools loaded.\n`
    );

    const agentEvents = createAgentEvents();

    // Send initial message to trigger onboarding greeting
    process.stdout.write("first-responder> ");
    await sendMessage("Hello", agentEvents);
    process.stdout.write("\n");

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

      // Handle /tools toggle
      if (userInput.toLowerCase() === "/tools") {
        toolVerbosity = toolVerbosity === "minimal" ? "full" : "minimal";
        console.log(`Tool output: ${toolVerbosity}`);
        continue;
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
