# Development Task List

Use this file only for approved, active multi-iteration work that needs decomposition, status tracking, or handoff. Keep raw screenshots, logs, and observation-only reports in `bugs_reports/`.

## Active Task Register

| ID | Source / evidence | Priority | State | Summary |
| --- | --- | --- | --- | --- |
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
