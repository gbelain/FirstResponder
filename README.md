# FirstResponder: AI-Powered Incident Response Agent

## Project Overview

FirstResponder is an AI agent designed to assist engineering teams during production incidents by intelligently querying logs, identifying patterns, proposing hypotheses, and maintaining a shared investigation state. **The agent acts as a collaborative hub where multiple engineers can simultaneously investigate an incident, with each team member's findings automatically shared and synthesized for the entire group.** This eliminates duplicate work, preserves context across shift changes, and ensures everyone benefits from collective discoveries.

## Problem Statement

During production incidents, engineering teams face several challenges:

1. **Information Overload**: Logs and metrics contain massive amounts of data, making it difficult to identify relevant signals
2. **Duplicate Investigation**: Multiple team members often query the same logs or investigate the same hypotheses independently and in their own LLM chats with incomplete context.
3. **Lost Context**: When shifts change (for teams with members from different timezones) or new team members join, investigation progress and ruled-out hypotheses aren't easily accessible
4. **Timeline Reconstruction**: After resolution, recreating the incident timeline for postmortems requires manually gathering scattered information
5. **Siloed Discoveries**: Engineers working in parallel don't see each other's findings until they manually sync up, wasting valuable time

## Solution

FirstResponder addresses these challenges through:

**Intelligent Log Analysis**: The agent queries Google Cloud Platform logs, identifies anomalies, correlates events, and extracts meaningful patterns from noisy data. In a second iteration the agent could also include context from Slack channels.

**Hypothesis Management**: The agent proposes potential root causes based on evidence, tracks supporting and counter-evidence for each hypothesis, and maintains clear confidence levels throughout the investigation.

**Shared Investigation State**: All findings, hypotheses, and timeline events are stored in a centralized memory accessible to all investigators. When one engineer discovers something, it immediately becomes available to everyone else, preventing duplicate work and enabling seamless handoffs between team members or shifts.

**Cross-Thread Context Awareness**: Each engineer has their own private conversation with the agent, but the agent actively connects findings across threads. When Engineer A discovers evidence related to Engineer B's hypothesis, the agent proactively mentions this connection, creating a collaborative investigation experience without requiring manual coordination.

**Human-in-the-Loop**: The agent suggests actions and conclusions but always requires human validation for critical decisions like confirming root causes or marking incidents as resolved.

## Technical Approach

### Architecture

**Core Components:**
- **Claude Sonnet 4.5** as the reasoning engine (might change)
- **Google Cloud Observability MCP** for log querying and metrics access (could switch to Datadog once MCP access request gets approved, need to verify the benefits of using DD rather than GCP logs)
- **Agent Studio Memory** for persistent incident state storage
- **Chat Interface** for human-agent interaction (separate thread per investigator)
- **Dashboard** for visualizing shared investigation state (timeline, hypotheses, findings)

### Memory Structure

The agent maintains structured JSON for each incident containing:
- **Metadata**: Incident ID, start time, affected services, severity, current status, active investigators
- **Timeline**: Chronological events from log analysis and human input
- **Hypotheses**: Proposed root causes with evidence, confidence levels, current status, and attribution
- **Key Findings**: Critical errors, metric anomalies, configuration changes
- **Ruled Out**: Hypotheses that have been investigated and dismissed with reasoning

### Collaboration Model

**Multi-Thread Architecture**: Each engineer has a private conversation thread with the agent, allowing them to ask questions and investigate freely without cluttering others' views.

**Shared Memory**: The agent maintains one unified investigation state across all threads. When any engineer's interaction produces a finding, it's immediately written to shared memory.

**Proactive Synthesis**: When an engineer asks a question, the agent first checks shared memory. If another engineer already investigated this, the agent provides the cached answer and attributes it. If an engineer's finding relates to another's hypothesis, the agent explicitly connects them.

**Dashboard Visibility**: A centralized dashboard displays the current investigation state (timeline, hypotheses, findings) with 1-minute refresh intervals. Engineers check the dashboard when they want the full picture without interrupting their conversation flow.

**No Real-Time Notifications**: Engineers aren't interrupted by notifications. They discover others' findings either through the agent proactively mentioning them in conversation or by checking the dashboard.

**Handoff Support**: When a new engineer joins the incident, the agent provides a concise summary of current status, active hypotheses, what's been ruled out, and who's investigated what.

## Current Status

We have validated that Claude Code can successfully query GCP logs for Agent Studio services using the Google Cloud Observability MCP. This proves the foundational capability of the agent to access and analyze production logs.

## Multi-Phase Development Plan

### Phase 1: Core Investigation Loop
Establish single-user incident investigation with GCP log querying, hypothesis management, and structured memory (for now memory is stored in a file, Agent Studio memory implementation will come in a later phase). Validates that the agent can effectively investigate incidents before adding collaboration complexity.

### Phase 2: Implementing Agent Studio memory
#TODO Complete this phase using Agent Studio docs as context

### Phase 3: Multi-User Collaboration
Add support for multiple simultaneous investigators with separate conversation threads, shared memory access, and cross-thread context awareness. Enables real teams to collaborate through the agent.

### Phase 4: Investigation Dashboard
Build a web-based dashboard displaying real-time incident state including timeline, active hypotheses, key findings, and ruled-out theories. Provides visibility into investigation progress without requiring chat interaction.

### Phase 5: Memory Optimization
Implement background workers for memory summarization, compression of redundant queries, and intelligent context window management for long-running incidents. Ensures system scalability.

### Phase 6: Postmortem Generation
Enable automatic postmortem document creation using accumulated timeline, hypotheses, and resolution details. Reduces post-incident documentation burden.

### Phase 7: Historical Pattern Recognition (Out of scope for lab week)
Give the agent access to past incident memories to identify recurring patterns, suggest similar root causes, and accelerate investigation of familiar issues. Builds institutional knowledge over time.

---

## Success Metrics

**Investigation Speed**: Time from incident detection to root cause identification

**Collaboration Efficiency**: Reduction in duplicate log queries across team members

**Context Preservation**: Successful handoffs between shifts without information loss

**Cross-Pollination**: Frequency of agent connecting findings from different investigators

**Postmortem Quality**: Completeness and accuracy of auto-generated timeline and analysis

## Risks and Mitigations

**Risk**: Agent makes incorrect root cause suggestions  
**Mitigation**: Human-in-the-loop model requires validation for all critical decisions

**Risk**: Context window limits for long incidents  
**Mitigation**: Phase 4 memory compression and summarization

**Risk**: GCP API rate limits during high query volume  
**Mitigation**: Agent checks memory before querying, caches results, implements backoff strategies

**Risk**: Engineers don't trust agent suggestions  
**Mitigation**: Show evidence trail for all hypotheses, maintain transparency in reasoning, attribute findings to investigators

**Risk**: Collaboration overhead reduces investigation speed  
**Mitigation**: No real-time notifications, asynchronous discovery through dashboard and proactive agent mentions