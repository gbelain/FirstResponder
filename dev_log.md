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

## 2026-03-18 — Session 7: Dashboard UX Improvements

### Goal

Improve the dashboard UX in parallel with the Agent Studio memory work (separate branch: `user-interface-improvements` off `main`). Used Playwright CLI for automated browser testing throughout.

### Testing approach: Playwright CLI

Used `playwright-cli` to test every change in a headless browser — taking snapshots and screenshots after each interaction. This caught several issues that wouldn't surface from code review alone:
- **React hooks ordering violation**: Adding a `useEffect` after early returns in `InvestigationPanel` caused a "change in the order of Hooks" error visible in the Next.js error overlay
- **Next.js dev tools overlap**: The floating dev tools button in the top-left corner intercepted clicks on the back arrow — confirmed as dev-only (not a prod issue)
- **Hydration mismatch**: `sessionStorage` reads in `useState` initializer caused server/client divergence

Playwright was also used to verify keyboard shortcuts don't fire when typing in the chat input (typed "test 123" in the input field and confirmed tabs didn't switch).

### Changes made

**Bug fixes**:
- Fixed `Can't resolve '@/lib/tools'` error — created AI SDK v6 tool wrappers (`dashboard/utils/tools.ts`) with Zod schemas and `execute` functions for all 12 memory tools
- Fixed `Can't resolve '@/lib/mcp-tools'` error — created MCP tool loader (`dashboard/utils/mcp-tools.ts`) using `@ai-sdk/mcp` package with `Experimental_StdioMCPTransport`
- Moved files from `lib/` to `utils/` because `.gitignore` had a blanket `lib/` rule (from Python template)
- Fixed hydration mismatch — deferred `sessionStorage` message loading to a post-mount `useEffect` instead of `useState` initializer

**UX improvements**:
- **Light/dark theme**: Added CSS variables for light mode, `ThemeToggle` component that persists to `localStorage`, placed in chat header and home page
- **Layout rebalance**: Swapped chat/investigation split from 55/45 to 45/55 — investigation panel gets more space
- **Back navigation**: Added back arrow in chat header linking to the investigations list (`/`)
- **Status indicator honesty**: Replaced always-pulsing green dot with state-aware indicator: solid green (ready), pulsing cyan (streaming), solid red (error). Tooltip shows state name.
- **Keyboard shortcuts**: `&`/`é`/`"` (AZERTY top row, no modifier needed) to switch investigation tabs (Timeline/Hypotheses/Findings). `Cmd+Enter` to send chat message from anywhere. Tab buttons show `<kbd>` hints. Shortcuts are suppressed when focus is in a text input.

**Dependencies added**:
- `@ai-sdk/mcp` — Native AI SDK MCP client integration (replaces manual Anthropic SDK format conversion)

### Merge status

Branch merged cleanly into `main` (no conflicts with the Agent Studio memory work from Session 6).

### Next steps

- Further UX improvements: resizable panels, quick action prompts, responsive layout
- Test full end-to-end investigation flow through the updated dashboard
- Deploy considerations

## 2026-03-18 — Session 8: Migrate Storage from JSON Files to Algolia Index (Phase 3)

### Goal

Replace file-based incident storage (`investigations/*.json`) with an Algolia index. Same function signatures, pure storage swap — no changes to consumers.

### Why it's clean

All file I/O was isolated in a single 65-line file: `src/memory/storage.ts`. It exports 5 functions. Every consumer (operations.ts, CLI tools, dashboard API routes) imports from this file. Replace the internals, keep the signatures, nothing else changes.

### Implementation

**Dependency**: Installed `algoliasearch` in both root and `dashboard/` workspaces.

**Environment variables**: Added `ALGOLIA_APP_ID`, `ALGOLIA_API_KEY`, `ALGOLIA_INDEX_NAME` to `.env` and `dashboard/.env.local`. Reuses the same API key as `MEMORY_API_KEY` (confirmed correct ACLs). Removed `MEMORY_DIR` from `dashboard/.env.local` (no longer relevant).

**`src/memory/storage.ts` — full rewrite** (only file with code changes):

| Function | Before (files) | After (Algolia) |
|---|---|---|
| `ensureMemoryDir()` | Creates `investigations/` dir | No-op (kept export to avoid breaking imports) |
| `loadMemory(id)` | `readFile` + `JSON.parse` | `client.getObject({ objectID: id })`, catch 404 → null |
| `saveMemory(memory)` | `writeFile` + `JSON.stringify` | `client.saveObject({ objectID: memory.incident_id, ...memory })` |
| `memoryExists(id)` | `access()` file check | `client.getObject()` with minimal attributes, catch 404 → false |
| `listIncidents()` | `readdir` + filter `.json` | `client.searchSingleIndex({ query: '' })`, extract IDs from hits |

**Key design decisions**:
- **Lazy client singleton**: `getClient()` avoids crash at import time if env vars not yet loaded (matters for Next.js build phase)
- **objectID**: Uses `incident_id` as Algolia's `objectID` (natural key, already unique)
- **Response cleaning**: `stripAlgoliaFields()` removes `objectID`, `_highlightResult`, `_snippetResult`, `_rankingInfo` before returning `IncidentMemory`
- **No `waitForTask`**: Algolia indexing is async (~1-2s). Current call patterns never do save-then-immediately-load (operations return the in-memory object). Keeps saves fast.
- **Algolia type**: The client type is `Algoliasearch` (not `AlgoliaClient` — caught by typecheck)

### Files modified

| File | Change |
|---|---|
| `src/memory/storage.ts` | Full rewrite — only file with code changes |
| `.env` | Added 3 Algolia vars |
| `dashboard/.env.local` | Added 3 Algolia vars, removed `MEMORY_DIR` |
| `package.json` | Added `algoliasearch` dep |
| `dashboard/package.json` | Added `algoliasearch` dep |

### Files NOT modified (same signatures, no changes needed)

`src/memory/operations.ts`, `src/tools/memory-tools.ts`, `dashboard/app/api/incidents/route.ts`, `dashboard/app/api/investigation/[incidentId]/route.ts`, `dashboard/app/api/chat/route.ts`, `dashboard/utils/tools.ts`

### Verification

1. **Typecheck**: `npm run typecheck` passes cleanly (root). Dashboard has one pre-existing TS warning in `utils/tools.ts` unrelated to this change.

2. **Direct Algolia CRUD test**: Ran a Node script exercising save → get → list → delete against the `firstresponder_incidents` index. All operations succeeded.

3. **End-to-end dashboard test** (Playwright CLI):
   - Navigated to `http://localhost:3000`, clicked "+ New Investigation"
   - Sent "Users are reporting 500 errors on the rag-api. Please investigate."
   - Agent asked clarifying questions and called `list incidents` tool (returned empty, correct)
   - Replied with timing/environment details
   - Agent called `create_incident` tool — incident saved to Algolia, URL updated to `/investigation/inc_mmw8dyah_mqg7`
   - Agent queried GCP logs, found DNS resolution failures, added timeline events, findings, and a hypothesis — all persisted to Algolia via successive `saveMemory()` calls
   - Investigation panel rendered correctly: title, severity (critical), status (investigating), TLDR, timeline with 3 events, 1 hypothesis, 1 finding
   - Navigated back to landing page — incident listed with correct metadata, severity/status badges

4. **Algolia dashboard confirmation**: Queried `firstresponder_incidents` index directly — full incident record present with all nested data (timeline, hypotheses, findings, TLDR).

### Target index

- **App**: `K85SX0UT2W`
- **Index**: `firstresponder_incidents`

### Notes

- **Algolia 100KB record limit**: Fine for now. Large incidents with hundreds of events could approach it eventually — monitor and compress later if needed.
- **Race conditions**: Load-modify-save is not atomic, same as files. Acceptable for current single-user usage. For multi-user (Phase 4), consider `partialUpdateObject`.
- **Async indexing**: Algolia's ~1-2s indexing delay means the landing page may not show a just-created incident on immediate navigation. In practice this wasn't an issue during testing — the agent's response takes longer than the indexing delay.

### Next steps

- Deploy dashboard to Vercel (MCP subprocess lifecycle needs addressing for serverless)
- Phase 4: Multi-user collaboration
- Monitor Algolia record sizes as investigations grow

## 2026-03-19 — Session 9: Multi-User Collaboration (Phase 4)

### Goal

Enable multiple engineers to investigate the same incident simultaneously, each in their own chat session, with shared incident state in Algolia. Findings, hypotheses, and timeline events from one engineer are visible to all others.

### Step 0: Merge main into multi-user-collaboration branch

Brought in Algolia storage (`src/memory/storage.ts`), `algoliasearch` dependency from Session 8. Clean merge, no conflicts.

### Step 1: Data model changes (`src/types/memory.ts`)

- Added `ActiveInvestigator` interface (`name` + `last_seen` timestamp)
- Replaced `metadata.investigator: string` with `metadata.investigators: string[]`
- Added `_version: number` and `active_investigators: ActiveInvestigator[]` to `IncidentMemory`
- Changed `hypothesis.proposed_by` from `"agent" | "user"` enum to `string` (now carries investigator name or `"agent"`)
- Added optional `finding.discovered_by` and `timelineEvent.reported_by` fields

### Step 2: Storage layer (`src/memory/storage.ts`)

- **`partialUpdate(incidentId, fields)`**: Uses `partialUpdateObjects` to write only specified top-level fields. Two engineers writing to different fields (one to `timeline`, one to `findings`) won't overwrite each other.
- **`loadMemoryWithVersion(incidentId)`**: Returns `{ memory, version }` preserving `_version` for optimistic locking.
- **`saveMemoryVersioned(memory, expectedVersion)`**: Read-check-write pattern — returns `{ success: false }` on version mismatch. Small race window acceptable for 2-5 engineers.
- **Backward compatibility**: `migrateRecord()` converts legacy `investigator` → `investigators[]`, defaults `_version` to 0 and `active_investigators` to `[]`.

### Step 3: Operations layer (`src/memory/operations.ts`)

**Concurrency strategy** — two tiers:
1. **Append operations** (`addTimelineEvent`, `proposeHypothesis`, `addFinding`): Use `partialUpdate` for field-level writes. Only overwrites the specific array field, not the whole record.
2. **Mutation operations** (`updateHypothesis`, `ruleOutHypothesis`, `confirmRootCause`, `updateTLDR`): Wrapped in `withOptimisticLock(incidentId, mutateFn, maxRetries=3)` — load with version, mutate, versioned save, retry on conflict.

Other changes:
- `generateHypothesisId()` now uses timestamp+random (was sequential `hyp_1`, `hyp_2` — collision-prone with multiple concurrent agents)
- `createIncident()` sets `investigators: [name]`, `_version: 1`, `reported_by` on initial timeline event
- New `updateActiveInvestigator(incidentId, name)` — updates presence tracking + ensures name in investigators list via `partialUpdate`

### Step 4: Tool definitions

**Dashboard** (`dashboard/utils/tools.ts`):
- Converted `export const memoryTools` → `export function createMemoryTools(userName: string)` factory
- `create_incident` auto-injects `investigator: userName` (removed from agent schema)
- `add_timeline_event` injects `reported_by: userName`
- `add_finding` injects `discovered_by: userName`
- `propose_hypothesis` schema changed from `z.enum(["agent","user"])` to `z.string()`

**CLI** (`src/tools/memory-tools.ts`):
- Updated schemas: `proposed_by` → string, added `discovered_by` and `reported_by` fields
- Updated execute handlers to pass new fields through

### Step 5: Chat API route (`dashboard/app/api/chat/route.ts`)

- Accepts `userName` from request body
- Calls `updateActiveInvestigator(incidentId, userName)` fire-and-forget on each request
- Builds user-aware tools via `createMemoryTools(userName)`
- Injects investigator identity + multi-user awareness instructions into system prompt

### Step 6: System prompt (`src/agent/prompt.ts`)

Added "Multi-Investigator Awareness" section: check for existing findings before querying, check for duplicate hypotheses, reference other investigators' work, attribution fields explained.

### Step 7: Frontend — user identity

- **`dashboard/hooks/use-user-name.ts`** (new): `useUserName()` hook backed by `localStorage` key `fr-user-name`. Uses `useSyncExternalStore` for SSR safety.
- **`dashboard/components/ui/name-dialog.tsx`** (new): Modal overlay prompting for display name on first visit. Matches existing dark theme.
- **`dashboard/app/investigation/[incidentId]/page.tsx`**: Gates on `useUserName()` — shows `NameDialog` when null, passes `userName` to `ChatPanel`.
- **`dashboard/components/chat/chat-panel.tsx`**: Accepts `userName` prop, includes it in `DefaultChatTransport` body.

### Step 8: Frontend — attribution + active investigators

- **`metadata-bar.tsx`**: Replaced `incident.metadata.investigator` with `investigators.join(", ")`. Added active investigator badges with green pulsing dots (filtered to `last_seen` < 30s ago).
- **`hypothesis-card.tsx`**: Shows `proposed_by` attribution below hypothesis title.
- **`findings-list.tsx`**: Shows `discovered_by` attribution in each finding card.

### Verification

- `npm run typecheck` (root): passes
- `tsc --noEmit` (dashboard): passes
- `tsc` (root build): passes
- `next build --webpack` (dashboard): compiles successfully

### Key design decisions

- **Field-level writes for appends**: `partialUpdate` narrows the write scope — two engineers adding to different arrays (`timeline` vs `findings`) simultaneously won't overwrite each other. Full saves reserved for mutations that touch multiple fields.
- **Optimistic locking for mutations**: `_version` field with read-check-write. Small race window between read and write is acceptable for the expected concurrency (2-5 engineers).
- **No auth**: Display name in localStorage. Sufficient for internal tool — real auth is out of scope.
- **Chat stays in sessionStorage**: Each engineer has their own chat history. Incident state (the shared data) lives in Algolia.
- **Passive cross-thread awareness**: Agent calls `get_incident` before writes to see fresh state. No push notifications between sessions — the 1.5s SWR polling on the investigation panel handles visibility.

### Next steps

- Manual multi-user testing: two browser windows, different names, same incident
- Concurrency stress test: simultaneous writes from multiple sessions
- Deploy to Vercel
- Consider WebSocket/SSE for real-time cross-session updates (currently 1.5s polling)

## 2026-03-19 — Session 10: Agent Prompt Tuning + Metrics Dashboard

### Part 1: System Prompt Improvements

Based on a test investigation where the agent was too verbose, asked redundant clarifying questions, and dumped hypothesis details into chat instead of the dashboard, made several prompt changes.

**`src/agent/prompt.ts` — System prompt overhaul**:

1. **Shorter onboarding**: First message must be 2-4 sentences max. If the user already gave enough info (service, env, symptoms), skip questions and start investigating immediately. No bulleted option lists.
2. **Service aliases**: Added mapping section — "agent studio" → `generativeai-rag-api`, "shopping guides" → `generativeai-shopping-guides-api`. Worker/scheduler for background tasks (celery, analytics, cache, conversation title generation).
3. **Environment & project mapping**: staging → `alg-ai-platform-staging`, prod EU → `alg-ai-platform` (europe-west3), prod US → `alg-ai-platform` (us-east4). Only asks if environment is missing.
4. **Hypotheses go to dashboard, not chat**: Explicit instruction to use `propose_hypothesis` tool and NOT write hypothesis details in chat. Agent should say "I've proposed N hypotheses — check the Hypotheses tab" instead.
5. **Shorter communication**: Added rule to avoid repeating info already visible in the dashboard.

**`dashboard/components/ui/badge.tsx`**: Changed confidence badge from showing just `medium` to `confidence: medium` for clarity.

### Part 2: Always-On Metrics Dashboard

Added a collapsible metrics panel to the investigation dashboard that automatically fetches and displays GCP container metrics for the service(s) being investigated.

**Discovery phase**: Queried `list_metric_descriptors` on both staging and prod projects. Found that:
- **k8s container metrics** (CPU, memory, restarts, uptime) are available on all environments
- **Istio data plane metrics** (`istio.io/service/server/*`) have descriptors registered but NO actual data — sidecar telemetry not enabled
- **Load balancer metrics** — descriptors exist on prod but no data returned

Decision: Use k8s container metrics which are universally available.

**New files created**:
- `dashboard/types/metrics.ts` — Types for `DataPoint`, `ServiceMetrics`, `MetricsResponse`
- `dashboard/app/api/investigation/[incidentId]/metrics/route.ts` — API route that loads incident memory, fetches 6 metrics per service via MCP `list_time_series` (parallel), aggregates multi-pod time series, returns structured data
- `dashboard/hooks/use-metrics.ts` — SWR hook polling every 30s
- `dashboard/components/investigation/metric-chart.tsx` — Reusable recharts chart card (area + bar variants, multi-series support, custom dark-themed tooltip)
- `dashboard/components/investigation/metrics-panel.tsx` — Collapsible 2-column grid with 6 charts per service, loading skeletons, localStorage-persisted collapse state

**Modified files**:
- `src/types/memory.ts` — Added optional `gcp_project` to `Metadata` (defaults to `alg-ai-platform-staging` when absent)
- `dashboard/utils/mcp-tools.ts` — Added `callMcpTool()` for direct MCP tool calls outside the AI SDK `streamText` loop
- `dashboard/app/globals.css` — Added 7 metric color CSS variables (dark + light theme)
- `dashboard/components/investigation/investigation-panel.tsx` — Integrated MetricsPanel between TLDR and tabs via `next/dynamic` (SSR disabled for recharts)
- `dashboard/package.json` — Added `recharts` dependency

**6 metrics shown** (all `kubernetes.io/container/*`, filtered by `resource.labels.pod_name = starts_with("{service}")`):

| Chart | Metric | Signal |
|---|---|---|
| CPU Utilization | `cpu/limit_utilization` (ALIGN_MEAN) | % of limit — saturation |
| CPU Cores Used | `cpu/core_usage_time` (ALIGN_RATE) | Absolute load — spikes |
| Memory Utilization | `memory/limit_utilization` (ALIGN_MEAN) | % of limit — OOM risk |
| Memory Used | `memory/used_bytes` (ALIGN_MEAN) | Absolute bytes — leak detection |
| Pod Restarts | `restart_count` (ALIGN_DELTA) | Stability — crashloops |
| Uptime | `uptime` (ALIGN_MEAN) | Drops reveal restarts |

**Alignment period** auto-adjusts: 60s (≤1h), 300s (≤6h), 600s (≤24h), 3600s (>24h). Minimum 1 hour of data shown even for brand-new incidents.

### Bugs fixed during implementation

1. **`alignmentPeriod` format**: GCP requires protobuf Duration format (`"300s"` not `"300"`). Was causing all metric queries to silently fail.
2. **MCP `execute()` return format**: The AI SDK's MCP tool `execute()` returns a `CallToolResult` object (`{ content: [{ type: "text", text: "..." }] }`), not a plain string. Added `extractMcpText()` helper to unwrap the MCP response before JSON parsing.

### Known limitations

- **No request rate/error rate/latency charts**: Istio data plane metrics aren't available on these services. Would need Istio sidecar telemetry enabled or a different metrics source (e.g., application-level Prometheus metrics).
- **`gcp_project` not set on incidents**: The agent doesn't currently set `metadata.gcp_project` when creating incidents. Falls back to `alg-ai-platform-staging`. For prod investigations, metrics will query staging unless the field is manually set. Needs a prompt update to have the agent set this field.

### Next steps

- Update `create_incident` tool and prompt to set `gcp_project` based on environment
- Add Istio/LB metrics support once telemetry is enabled on the clusters
- Consider adding request rate metrics from application-level sources (Datadog, custom metrics)
- Manual testing of the full investigation flow with metrics visible
