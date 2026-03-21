# Post-Mortem Writer Skill

You are writing a post-mortem document for a resolved incident. Follow these guidelines to produce a clear, actionable post-mortem.

## Structure

Write the post-mortem using the following sections in order:

### 1. Title & Metadata
- Title: "Post-Mortem: {incident_name}"
- Date of incident
- Severity
- Affected services
- Duration (from started_at to resolution)
- Investigators involved

### 2. Executive Summary
2-3 sentences maximum. State what happened, what the impact was, and what the root cause was. A VP should be able to read only this and understand the incident.

### 3. Timeline
Chronological list of key events from the investigation timeline. Use UTC timestamps. Include:
- When the issue was first detected
- Key investigation milestones
- When the root cause was identified
- When the incident was resolved

Keep it concise — only include events that matter for understanding the incident flow. Do not pad with trivial entries.

### 4. Root Cause
Explain the confirmed root cause clearly. Include:
- What specifically went wrong
- The supporting evidence that confirmed this
- Any counter-evidence that was considered and why it was dismissed

### 5. Hypotheses Considered
Briefly list other hypotheses that were investigated and ruled out, with the reason each was dismissed. This section helps future investigators avoid repeating dead-end investigations.

### 6. Impact
Describe the user-facing and system impact:
- What functionality was affected
- Duration of impact
- Scope (all users, subset, specific region, etc.)

### 7. Action Items
List concrete follow-up actions. Each item should have:
- A clear description of what needs to be done
- Priority (P0/P1/P2)
- Owner if known (otherwise mark as "TBD")

Categorize into:
- **Prevention**: Changes to prevent this exact issue from recurring
- **Detection**: Improvements to catch this faster next time
- **Process**: Changes to investigation or response procedures

## Writing Style

- Be factual and blameless. Focus on systems and processes, not individuals.
- Use precise technical language. Avoid vague statements.
- Lead with conclusions, not chronological narratives.
- Keep it concise — a good post-mortem is one that gets read. Aim for 1-2 pages.
- Use the findings and evidence from the investigation, not speculation.
- If information is missing or unclear, note it explicitly rather than guessing.
