# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**FirstResponder** is an AI-powered incident response agent that helps engineering teams investigate production incidents by querying Google Cloud Platform logs, identifying patterns, proposing hypotheses, and maintaining structured investigation memory.

**Current Phase**: Phase 1 - Core Investigation Loop (single-user, file-based memory)

**Key Technology Decisions**:
- Language: TypeScript (Node.js runtime)
- AI Model: Claude Sonnet 4.5 (via Anthropic TypeScript SDK)
- Log Source: GCP via google-cloud-observability MCP server
- Memory: JSON files (Agent Studio memory integration in later phase)
- Interface: CLI (Next.js dashboard in later phase)

## Core Architecture Concepts

### Memory Structure

The agent maintains a structured JSON file for each incident investigation. This is the central artifact that persists all investigation state:

**Key Sections**:
- `metadata`: Incident ID, start time, affected services, severity, status, investigator
- `tldr`: Human-readable summary of current state
- `timeline`: Chronological events from logs and human input
- `hypotheses`: Proposed root causes with evidence, confidence levels, and status tracking
- `findings`: Errors, metrics, and configuration changes discovered (unified type with `type` field)
- `ruled_out`: Dismissed hypotheses with reasoning

**Critical Files**: See [1_spec_phase_one.md](1_spec_phase_one.md) lines 44-153 for complete memory schema.

### Agent Behavior Model

**Core Principles**:
1. **Query Before Answering**: Check memory first, only query GCP if information is missing
2. **Hypothesis Management**: Propose hypotheses with explicit confidence levels (high/medium/low), track supporting/counter evidence
3. **Human-in-the-Loop**: Suggest actions, never execute critical decisions without confirmation
4. **Timeline Awareness**: Always use UTC timestamps, note temporal correlations
5. **Concise Communication**: Engineers are under pressure - lead with conclusions, details on request

**Memory Operations**:
- Add timeline events after each significant finding
- Create hypothesis objects with unique IDs when proposing theories
- Update confidence and evidence as investigation progresses
- Move to `ruled_out` array with reasoning when dismissing hypotheses
- Ask for human confirmation before marking root cause as confirmed

## GCP Log Querying

### Target Environment

- **Project**: `alg-ai-platform-staging`
- **Cluster**: `ai-platform-staging-europe-west3` (GKE)
- **Namespace**: `generativeai`
- **Services**: generativeai-rag-api, generativeai-shopping-guides-api, generativeai-rag-worker, generativeai-rag-task-scheduler

### Query Patterns (google-cloud-observability MCP)

**Essential Query Structure**:
```
resource.type="k8s_container"
AND resource.labels.pod_name:"SERVICE_NAME"
AND timestamp >= "2026-02-02T07:00:00Z"
```

**Critical Rules**:
- Always specify `resource.type="k8s_container"` for GKE workloads
- Always include timestamp filters (GCP uses UTC)
- Use `:` operator for partial pod name matching (pod names include deployment hashes)
- Never use exact match (`=`) for pod names
- Set `pageSize` appropriately (default: 50)
- Use `orderBy: "timestamp desc"` for recent activity, `"timestamp asc"` for historical analysis

**Log Payload Types**:
- `jsonPayload`: Structured logs - access with `jsonPayload.field_name`
- `textPayload`: Unstructured logs - search with `textPayload:"search term"`

**Severity Levels**:
- `INFO`: Normal operations, business events
- `WARNING`: Non-critical issues, configuration problems
- `ERROR`: Issues requiring attention, application exceptions

**Filtering Strategy**:
1. Start broad (all services, recent timeframe)
2. Narrow to specific service
3. Exclude noise (health checks, known warnings)
4. Focus on specific patterns or errors

**Correlation Techniques**:
- Use `jsonPayload.dd.trace_id` to follow requests across services
- Use app_id/agent_id for business correlation
- Match timestamps for temporal correlation (always UTC)
- For async workflows, check worker logs shortly after scheduler dispatches

### Service Personalities

**High-Frequency (APIs)**: Expect continuous logs; gaps > 5 minutes concerning
**Event-Driven (Workers)**: Logs in bursts; silence between events is normal
**Scheduled (Schedulers)**: Very low log volume expected; daily patterns key

See [Docs/gcp_agent_studio_logging_guide.md](Docs/gcp_agent_studio_logging_guide.md) for comprehensive query patterns and service-specific insights.

## Phase 1 Requirements

**Functional Goals**:
- Agent can query GCP logs via MCP
- Maintains structured memory throughout investigation
- Proposes hypotheses based on log patterns
- Tracks evidence for/against each hypothesis
- Asks for human confirmation before marking root cause
- Memory persists across conversation (can resume investigation)

**Quality Criteria**:
- Avoid redundant GCP queries (check memory first)
- Hypotheses must be technically sound and evidence-based
- Timeline events chronologically ordered and meaningful
- Communication concise and actionable
- Investigation understandable from reading memory JSON alone

**Performance Targets**:
- Query response: < 10 seconds
- Memory operations: < 2 seconds
- Agent response: < 40 seconds end-to-end

## Example Investigation Flow

```
User: "Users can't complete checkout, getting 500 errors"

Agent:
1. Creates incident in memory with unique ID
2. Queries GCP logs for payment-service errors in recent timeframe
3. Identifies error spike with specific error message
4. Adds findings to memory timeline
5. Queries for recent changes/deployments around spike time
6. Proposes hypothesis with supporting evidence
7. Asks user if they want to investigate this path

User: "Check the hypothesis"

Agent:
1. Queries for additional evidence related to hypothesis
2. Updates hypothesis with new evidence
3. Assesses confidence based on accumulated evidence
4. If high confidence: "Based on evidence, I believe [hypothesis] is the root cause. Should I mark this as confirmed?"

User: "Yes"

Agent:
1. Updates hypothesis status to "confirmed_root_cause"
2. Suggests next steps for resolution
```

## Development Commands

```bash
npm run dev        # Run with tsx (fast, no build step)
npm run build      # Compile TypeScript to dist/
npm run start      # Run compiled JS from dist/
npm run typecheck  # Type check without emitting files
```

## Code Conventions

- **Imports at top**: All imports must be at the top of the file. Avoid dynamic imports inside functions.
- **UTC timestamps**: All timestamps in memory use ISO 8601 format in UTC.

## Future Phases (Out of Scope for Phase 1)

- Multi-user collaboration with separate conversation threads
- Agent Studio memory service integration (replacing file-based memory)
- Web dashboard for investigation visualization
- Memory compression and summarization
- Postmortem generation
- Historical pattern recognition

## Key Documentation Files

- [README.md](README.md): Complete project vision and multi-phase roadmap
- [1_spec_phase_one.md](1_spec_phase_one.md): Detailed Phase 1 specification including memory schema and agent behavior
- [Docs/gcp_agent_studio_logging_guide.md](Docs/gcp_agent_studio_logging_guide.md): Comprehensive GCP logging patterns and query examples
