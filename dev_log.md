# Development Log

Keeps track of development progress and helps knowing where the previous session left off when jumping back into the project.

## 2026-02-11 — Session 1: Project Foundation + Memory Layer

### Phase 1 Kickoff

Reviewed the full project state: all documentation and specs were in place, but zero implementation existed. Agreed on a 5-step implementation order:

1. Project Foundation
2. Memory Layer
3. MCP Integration
4. Agent Core
5. CLI Interface

### Step 1: Project Foundation

- Created `package.json` with core dependencies (`@anthropic-ai/sdk`, `typescript`, `tsx`, `@types/node`)
- Created `tsconfig.json` with strict TypeScript config (ES2022, NodeNext modules)
- Created `src/index.ts` entry point
- Verified all npm scripts work: `dev`, `build`, `start`, `typecheck`
- Added `node_modules/` and `dist/` to `.gitignore`

### Step 2: Memory Layer

- Created `src/types/memory.ts` — TypeScript types matching the incident memory schema from the spec (IncidentMemory, Hypothesis, Finding, Timeline, etc.)
- Created `src/memory/storage.ts` — File persistence layer (read/write/list JSON files in `investigations/` directory)
- Created `src/memory/operations.ts` — Higher-level functions for incident lifecycle:
  - `createIncident` — Initialize a new investigation
  - `addTimelineEvent` — Append chronological events
  - `proposeHypothesis` / `updateHypothesis` / `ruleOutHypothesis` / `confirmRootCause` — Full hypothesis management
  - `addFinding` — Record errors, metrics, config changes (unified Finding type)
  - `updateTLDR` — Update incident summary
  - Read operations: `getIncident`, `getHypotheses`, `getTimeline`
- Fixed redundant dynamic import in `storage.ts` (moved `readdir` to static imports)

### Dependencies added during session

- `@anthropic-ai/sdk` — Claude API client
- `@modelcontextprotocol/sdk` — MCP client (added later for future MCP integration)
- `zod` — Schema validation library

## 2026-02-11 — Session 2: MCP Integration

### Step 3: MCP Integration

Connected FirstResponder to the `google-cloud-observability` MCP server for GCP log querying.

**Architecture**: Direct MCP passthrough — MCP tools are fetched from the server, converted to Anthropic SDK format, and forwarded to Claude. No wrapper tools (documented as a future experiment).

**Files created**:
- `src/mcp/client.ts` — MCP client singleton with:
  - `getMcpClient()` — Lazy-connects to `@google-cloud/observability-mcp` via `StdioClientTransport` (npx)
  - `getMcpTools()` — Lists MCP tools and converts schemas to Anthropic `Tool` format
  - `executeMcpTool()` — Forwards tool calls to MCP server, parses text/JSON responses
  - `closeMcpClient()` — Cleanup on shutdown
- `src/mcp/index.ts` — Re-exports from client
- `src/tools/index.ts` — Updated to re-export MCP functions alongside memory tools
- `src/test-mcp.ts` — Test script (temporary) for verifying MCP connection
- `Docs/Experiments/wrapper-tools-experiment.md` — Documents future Option B (wrapper tools with project-specific defaults)

**Verification**:
- `npm run typecheck` — passes cleanly
- `npx tsx src/test-mcp.ts` — all 3 tests pass:
  - Listed 13 MCP tools (log entries, metrics, traces, alerts, error reporting)
  - Successfully queried recent logs from `alg-ai-platform-staging`
  - Successfully listed available log names

**Available MCP tools** (13 total): `list_log_entries`, `list_log_names`, `list_buckets`, `list_views`, `list_sinks`, `list_log_scopes`, `list_metric_descriptors`, `list_time_series`, `list_alert_policies`, `list_alerts`, `list_traces`, `get_trace`, `list_group_stats`

**Auth**: Uses local Application Default Credentials (ADC) — same as user's gcloud CLI.

## 2026-02-11 — Session 3: Agent Core + CLI

### Steps 4 & 5: Agent Core + CLI Interface

Combined steps 4 and 5 since the CLI is needed to test the agent.

**Files created**:
- `src/agent/prompt.ts` — System prompt constant encoding:
  - 5 core behaviors (query before answering, hypothesis management, timeline awareness, human-in-the-loop, concise communication)
  - GCP logging best practices (target project/cluster/namespace, query rules, log structure, filtering strategy, service personalities)
  - Investigation workflow (new incident + resume flows)
  - Tool names intentionally NOT listed — Claude sees tool definitions via the `tools` API parameter
- `src/agent/agent.ts` — Core agentic loop:
  - `initAgent()` — Creates Anthropic client, fetches MCP tools, merges with 12 memory tools
  - `sendMessage(userMessage, events?)` — Runs the agentic while-loop: stream Claude response → handle tool_use → execute tools → send results back → repeat until end_turn
  - `shutdownAgent()` — Closes MCP client
  - Tool routing via `Set<string>` lookup: memory tool names → `executeMemoryTool()`, everything else → `executeMcpTool()`
  - Errors returned to Claude as `{ error: "message" }` so it can reason about failures
  - `AgentEventHandlers` interface with 3 optional callbacks (`onText`, `onToolStart`, `onToolEnd`) — keeps agent module free of I/O
  - Uses `client.messages.stream()` for real-time token-by-token text output
- `src/agent/index.ts` — Re-exports
- `src/index.ts` — Rewritten from placeholder to interactive CLI:
  - `readline`-based input loop
  - Streaming text output via `onText` callback (token by token to stdout)
  - Tool call visibility: shows `[tool] name({args...})...` on start, then `ok`/`ERROR` on completion
  - Commands summary in banner (`exit`/`quit`, `Ctrl+C`)
  - Clean shutdown in `finally` block

**Model**: `claude-sonnet-4-5-20250929` (Claude Sonnet 4.5)

**Verification**:
- `npm run typecheck` — passes cleanly
- Ready for manual testing with `npm run dev`

### Iteration: Streaming + CLI visibility

After first manual test, the agent appeared to freeze with no feedback. Added:
- **Streaming**: Switched from `client.messages.create()` to `client.messages.stream()` — text now appears token by token
- **Tool call visibility**: Split single `onToolCall` into `onToolStart`/`onToolEnd` — CLI now shows which tool is executing *during* long MCP queries, not just after
- **Commands summary**: Banner now shows available commands

### Next steps

- Manual end-to-end testing with a real investigation
- Iterate on system prompt based on agent behavior observed during testing

## 2026-03-17 — Session 4: Resuming Development

### Picking back up

Resuming after a month-long break. Phase 1 core (memory, MCP, agent loop, CLI) is built but not yet battle-tested with a real investigation.

### Observations to act on later

1. **Codebase access**: The agent will need access to the project's codebase (likely via GitHub) to correlate log patterns with actual code. Currently it can only see logs — adding code context would let it trace errors to specific handlers, check recent commits/deploys, etc.
2. **System prompt GCP instructions**: The current system prompt includes GCP/MCP query guidance inline. Should revisit this to follow the Claude skills pattern more closely — may improve how reliably the agent constructs queries and interprets results.

### First manual test — results

**What worked well**:
- Log queries are well-formed and return relevant results
- Incident creation triggered naturally from user's problem description
- Timeline events, findings, and TLDR updated continuously throughout investigation
- Hypothesis lifecycle works end-to-end: propose → update → rule out (tested by reporting a false alarm and asking to conclude)
- Memory JSON is coherent and readable — the live TLDR is especially useful
- No agent loops, good response time

**Ideas from testing**:
1. **Guided onboarding**: Agent should open with a welcome message asking which project/environment to investigate (show available options: staging, prod-us, prod-eu) and guide the user through starting an investigation (time of first notice, issue description, etc.)
2. **Automated test flow**: Create a scripted end-to-end test that spins up the agent and submits a fixed sequence of user messages to verify the full investigation loop without manual interaction.
3. **CLI tool output toggle**: Add ability to toggle `[tool]` visibility in the CLI — sometimes you want to see full tool input/output, sometimes just the agent's responses.
4. **`ruled_out` redundancy**: The memory schema has both a `ruled_out` top-level array AND a status field on each hypothesis. Consider removing the separate `ruled_out` section — the hypothesis status already captures this, and duplication could drift.

### Future architecture note

The agent loop could eventually be replaced by developers running their own Claude Code instance that plugs into FirstResponder's harness (pre-configured MCP tools, shared investigation memory for collaboration). This would lower the integration barrier — devs use their existing Claude Code setup and just connect to the shared incident state.

### Next steps

- Act on test feedback: guided onboarding, CLI toggle, `ruled_out` schema question (this is done)
- Build automated test flow
- Revisit system prompt (skills pattern for GCP instructions)
- Add codebase access (GitHub integration)
