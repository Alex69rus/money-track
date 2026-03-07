---
name: iteration-retrospective-capture
description: Capture concise post-iteration takeaways and exploration notes into agent instructions. Use after implementation or debugging iterations to record pitfalls, root causes, validated patterns, and ruled-out paths so future runs avoid repeated mistakes and token waste.
---

# Iteration Retrospective Capture

Update project agent guidance with compact, actionable lessons after each iteration.

## Execute Workflow

1. Identify iteration events worth preserving:
- repeated failure patterns
- environment/tooling pitfalls
- reliability improvements
- validated shortcuts/workflows
2. Convert each event into one concise rule with:
- symptom
- root cause
- preferred fix or guardrail
3. Add short exploration notes:
- what was tested
- what was ruled out
- why
4. Keep notes actionable and scoped to the repository context.
5. Avoid narrative/history; store only reusable decision rules.

## Writing Rules

- Use imperative statements.
- Keep each bullet short and testable.
- Prefer defaults and concrete command patterns.
- Remove stale guidance when contradicted by newer findings.

## Minimum Post-Iteration Entry

Include:
- one takeaway bullet
- one exploration bullet
- one prevention rule for future runs
