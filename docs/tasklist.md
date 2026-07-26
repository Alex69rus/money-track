# Development Task List

Use this file only for approved, active multi-iteration work that needs decomposition, status tracking, or handoff. Keep raw screenshots, logs, and observation-only reports in `bugs_reports/`.

## Active Task Register

| ID  | Source / evidence | Priority | State | Summary |
| --- | ----------------- | -------- | ----- | ------- |

<!-- Add active multi-iteration work here. -->

## Task Detail Template

```markdown
## <ID> — <outcome-oriented name>

Source: <user request, bug report, or decision>

### Goal

<User-visible outcome.>

### Scope

- <Included boundary>
- <Explicit exclusion, if needed>

### Acceptance criteria

- <Testable outcome>
- <Required regression or verification>

### Plan

1. <Smallest safe implementation step>
2. <Verification step>

### Delivery record

- <What changed>
- Verification: `<command>` — <result>.
- Remaining exception: <none or concrete blocker>.
```

## Operating Rules

- Add a row only for approved multi-iteration work. Handle isolated defects and CI findings in their raw report and delivery handoff instead.
- Use one state: `Reported`, `Triaged`, `Planned`, `In progress`, `Fixed — verification pending`, `Verified`, `Blocked`, `Duplicate`, or `Won't fix`.
- Update active entries when scope or status changes. Remove completed entries once their durable evidence, decision, or delivery record is recorded in its appropriate document.
- Do not create a parallel roadmap, tracker, or TODO file.

## BR-003–BR-006 — AI Chat backend tool completion

Source bugs: BR-003, BR-004, BR-005, BR-006.

State: Verified.

### Goal

Provide safe, correctly scoped AI Chat query tools and a compatible retryable chat API.

### Delivery record — 2026-07-26

- Moved bounded pagination to tool parameters; added list sorting, aggregate page metadata, ungrouped totals, runtime-configured local period grouping, and numeric-only aggregation fields.
- Replaced the query-string chat route with authenticated `POST /api/chat`, ignoring client identity fields and returning a safe 503 for unavailable providers.
- Reused shared AI Chat seed/invocation fixtures and added tool and route regressions.
- Verification: focused AI Chat suite — 20 passed; backend format, lint, and type checks — passed; health-checked full suite — 88 passed, 2 skipped with `RUN_LLM_E2E=0`.
- Remaining exception: optional real-LLM tests were intentionally skipped; they are outside this deterministic backend slice.
