# Bug Report Template

Use one dated report for a cohesive smoke-test or feedback batch. Save it and its evidence in the repository-root `bugs_reports/` directory. Keep each issue independently addressable.

```markdown
# <Surface> findings — YYYY-MM-DD

Scope: <application area, build/client, and user flow>.

This report records observed defects only. Do not include a fix unless the user explicitly asks for one.

## Evidence

| File | Surface | Highlight |
| --- | --- | --- |
| `<filename>` | <screen/route> | <what the evidence demonstrates> |

## BR-### — <short, user-visible title>

Priority: P0 | P1 | P2 | P3

Evidence: `<filename>`; <optional user report or log reference>.

### Actual

<Observable current behavior.>

### Expected

<Desired user-visible behavior.>

### Reproduction

1. <precondition>
2. <user action>
3. <observable result>

### Acceptance criteria

- <independently testable outcome>
- <edge case or target client requirement>
- <non-regression requirement>
```

## Active Task-list Row Template

Use this only when the bug belongs to an approved multi-iteration batch. Isolated defects and CI findings do not need a task-list row.

```markdown
| ID | Source / evidence | Priority | State | Summary |
| --- | --- | --- | --- | --- |
| BR-### | `bugs_reports/<dated-report>.md` | P1 | Reported | <one-sentence user-visible defect and planned check> |
```

## Task Detail Template

Use this only for an approved multi-iteration batch.

```markdown
## BR-### — <outcome-oriented name>

Source bugs: BR-###, BR-###.

### Problem

<Shared user-visible problem and why these source bugs belong together.>

### Required behavior

- <behavior>

### Acceptance criteria

- <testable outcome>

### Likely boundaries

- `<file or component>`

### Delivery record — YYYY-MM-DD

- <what changed>
- Verification: `<command>` — <result>; <device/evidence result or exact exception>.
```
