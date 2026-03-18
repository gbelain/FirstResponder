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

## 2026-03-17 — Session 5: Investigation Dashboard (Phase 4)

### Goal

Build a Next.js web dashboard to replace the CLI as the primary interface. Developed concurrently with Phase 2 planning.

### Architecture decisions

- **Next.js App Router** in `dashboard/` directory alongside existing `src/`
- **Vercel AI SDK v6** (`ai`, `@ai-sdk/anthropic`, `@ai-sdk/react`) for streaming chat with tool calling
- **SWR polling** (1.5s interval) for auto-refreshing investigation panel from memory JSON files
- **Webpack mode** (`--webpack` flag) because Turbopack can't resolve `.js` → `.ts` imports from the shared `src/` code (Node ESM convention)
- Shared code imported via `@shared/*` TypeScript path alias pointing to `../src/*`
- Only change to existing code: `src/memory/storage.ts` — `MEMORY_DIR` now reads from `process.env.MEMORY_DIR` (defaults to `"investigations"`, CLI unaffected)

### What was built

**API routes**:
- `POST /api/chat` — Streaming chat via `streamText()` + `convertToModelMessages()` + `toUIMessageStreamResponse()`. Loads incident memory into system prompt for existing investigations.
- `GET /api/investigation/[incidentId]` — Returns investigation JSON for panel polling
- `GET /api/incidents` — Lists all incidents with summary metadata

**Tool integration**:
- `lib/tool-helper.ts` — Wrapper around AI SDK's `tool()` to work around Zod v4 type inference issues. Maps `parameters` → `inputSchema` (AI SDK v6 breaking change).
- `lib/tools.ts` — 12 memory tools in Vercel AI SDK format, delegating to existing `src/memory/operations.ts`
- `lib/mcp-tools.ts` — Dynamic MCP tool loading with proper Zod schema generation from JSON Schema (types: string, number, boolean, array)

**UI components**:
- **Chat panel** (`components/chat/`) — `useChat()` hook, streaming text, collapsible tool call display with memory/GCP badges, auto-scroll
- **Investigation panel** (`components/investigation/`) — Metadata bar (severity, status, elapsed time), TLDR card, tabbed content (Timeline, Hypotheses, Findings)
- **Badges** (`components/ui/badge.tsx`) — Color-coded severity, confidence, status, hypothesis status badges
- **Landing page** (`app/page.tsx`) — Incident list + "New Investigation" button

**Design**: "Mission Control" dark theme — near-black backgrounds (#09090b), electric cyan accents, Geist Mono for data, color-coded badges for severity/confidence.

### Issues encountered and fixed

1. **AI SDK v6 breaking changes** (main source of iteration):
   - `ai/react` → `@ai-sdk/react` (hooks moved to separate package)
   - `useChat` API: `input`/`handleInputChange`/`handleSubmit`/`api` removed, replaced by `sendMessage({ text })` + `transport` pattern
   - `maxSteps` → `stopWhen: stepCountIs(N)`
   - `UIMessage` parts flattened: `part.toolInvocation.toolName` → `part.type === "tool-{name}"` with flat properties
   - `toDataStreamResponse()` → `toUIMessageStreamResponse()`
   - `tool()` is identity function, expects `inputSchema` not `parameters`
   - `tool()` overloads broken with Zod v4 — needed `defineTool()` wrapper casting through `Function`

2. **Message format mismatch**: `useChat` sends `UIMessage[]` but `streamText()` expects `ModelMessage[]` — fixed with `convertToModelMessages()`

3. **MCP tool type coercion**: `z.any()` produced no type info, so `resourceNames` (array) and `pageSize` (number) were sent as strings — fixed by building proper Zod schemas from JSON Schema definitions

4. **Page remount on URL change**: `router.replace()` remounted the component and lost chat state — fixed with `window.history.replaceState()`

5. **Chat persistence across reloads**: Messages saved to `sessionStorage` keyed by incident ID

6. **Existing incident context**: Agent showed onboarding flow on existing incidents — fixed by loading incident memory into system prompt with instructions to skip onboarding

### Key lesson

When using libraries at unfamiliar versions, **read the installed package's type definitions before writing code**. The AI SDK v6 had major breaking changes from v3/v4 that caused 7+ build-fix cycles. A documentation MCP (e.g., Context7) would have prevented most of this.

### Current state

Dashboard is functional:
- Chat with streaming AI responses and visible tool calls
- Auto-refreshing investigation panel (timeline, hypotheses, findings)
- New investigation creation from chat
- Existing investigation resumption with context
- Session-based chat persistence
- Landing page with incident list

### Next steps

- Polish UI (loading states, error handling, responsive layout)
- Test end-to-end investigation flow through dashboard
- Deploy to Vercel (dashboard) — will need to address MCP subprocess lifecycle for serverless
- Continue Phase 2 (Agent Studio memory) planning

## 2026-03-18 — Session 6: Phase 2 Architecture Decision

### Agent Studio Memory Integration — Design Exploration

Spent the session exploring how to integrate Agent Studio memory into FirstResponder. Investigated the Agent Studio memory REST API (undocumented direct CRUD endpoints discovered in `algolia/conversational-ai` repo).

**Three approaches evaluated:**

1. **Full storage swap (single record per incident)**: Store entire IncidentMemory JSON in Agent Studio's `raw_extract` field (max 5000 chars). Problem: realistic investigations (~13000 chars) exceed the limit. Compaction strategies would degrade quality, and timeline events can't be trimmed (needed for postmortem generation).

2. **Manifest pattern (multi-record per incident)**: Split incident into separate memory records (1 per hypothesis, finding, timeline event) with a manifest record as index. Solves the size problem but provides no benefit over files/database for pure CRUD — we'd be fighting Agent Studio's memory model instead of using its strengths.

3. **Hybrid approach (chosen)**: Keep file-based storage for structured incident state + add Agent Studio memory for investigation learnings that compound across incidents. Plays to each system's strengths: files for deterministic CRUD, Agent Studio for semantic/episodic search.

**Key insight**: Agent Studio memory's value is in semantic search and episodic reasoning chains, not in structured data storage. Using it as a key-value store with extra steps wastes its capabilities. The right architecture is:
- **Files** (later → Algolia index): operational state (IncidentMemory CRUD)
- **Agent Studio memory**: institutional knowledge (episodic investigation steps, semantic learnings from resolved incidents, false alarm patterns)

**Agent Studio Memory REST API** (discovered endpoints):
- `POST /memory/semantic` — save facts/patterns
- `POST /memory/episodic` — save OTAR reasoning chains
- `POST /memory/search` — semantic + keyword search
- `GET /memory/{id}`, `PATCH /memory/{id}`, `DELETE /memory/{id}` — full CRUD
- Auth: `X-Algolia-Application-Id` + `X-Algolia-API-Key` (logs ACL) + `X-Algolia-Secure-User-Token`

### Implementation

After finalizing the architecture decision, implemented the full hybrid approach in the same session.

**API connectivity verified**: Wrote a Python test script to confirm the Agent Studio memory staging API accepts our credentials (`K85SX0UT2W` app, `logs` ACL key). All CRUD operations work. Plain string user token accepted (mapped to `userID: "default"`). Discovered the response uses camelCase (`objectID`, `rawExtract`, `memoryType`) not snake_case.

**New files created**:
- `.env` — Agent Studio API credentials (base URL, app ID, API key, user token)
- `src/memory/api-client.ts` — HTTP client for Agent Studio memory REST API (6 functions: `saveSemantic`, `saveEpisodic`, `searchMemories`, `getMemory`, `patchMemory`, `deleteMemory`). Uses Node 20 built-in `fetch`, reads credentials from `process.env`.
- `src/memory/learnings.ts` — Higher-level module for investigation learnings:
  - **Save functions** (fire-and-forget, never break the investigation): `saveInvestigationStep` (episodic OTAR), `saveRootCauseLearning` (semantic), `saveRuledOutLearning` (episodic), `saveFalseAlarmLearning` (semantic)
  - **Search function**: `searchPastLearnings(query, services?)` — returns formatted context string or null
  - All saves use `wait: false` for performance, wrapped in try/catch with console.error on failure
- `src/test-memory-api.ts` — Smoke test script for API lifecycle (save semantic, save episodic, search, get, delete, learnings module)

**Modified files**:
- `src/memory/operations.ts` — `confirmRootCause()` now also calls `saveRootCauseLearning()`, `ruleOutHypothesis()` now also calls `saveRuledOutLearning()`. Both are fire-and-forget (no await, won't block or break the operation).
- `src/tools/memory-tools.ts` — Added `search_past_incidents` tool (query + optional services filter) with handler calling `searchPastLearnings()`
- `src/agent/prompt.ts` — Investigation workflow updated: step 2 is now "Search past learnings (search_past_incidents) for similar issues". Added guidance: "Past learnings are hints, not conclusions — always verify against current evidence."
- `src/memory/index.ts` — Re-exports `api-client.ts` and `learnings.ts`
- `package.json` — `dev` script now loads `.env` via `--env-file=.env`

**Verification**:
- `npm run typecheck` — passes cleanly
- `npx tsx --env-file=.env src/test-memory-api.ts` — all operations pass (save, search, get, learnings module)
- End-to-end agent test: sent "Redis timeout errors on rag-api" to the agent. It:
  1. Created the incident in file-based storage
  2. Called `search_past_incidents` and found past learnings from test data
  3. Said: "past investigations show Redis timeout errors in rag-api have been tied to key format incompatibility after Redis version upgrades"
  4. Used that context to inform its log querying strategy
  5. Proceeded with normal investigation flow (GCP log queries, finding recording)

**Key design decisions**:
- Learning saves are fire-and-forget: `saveRuledOutLearning(...)` without `await`. If Agent Studio is down, the investigation continues normally.
- Keywords include `incident_id`, `"firstresponder"`, and service names for targeted search.
- `search_past_incidents` is an explicit tool (Option A from plan) — the agent decides when to search, rather than automatic preflight injection. Easier to debug and iterate.
- `.env` loaded via Node 20's `--env-file` flag instead of adding `dotenv` dependency.

### Next steps

- Manual testing with real investigation flow (create → investigate → resolve → start new → verify learnings surface)
- Consider adding `saveInvestigationStep` calls during the investigation loop (currently only confirmRootCause and ruleOutHypothesis trigger saves)
- Iterate on search quality (keyword tuning, result formatting)
- Phase 3: Swap file-based storage → Algolia index
