---
name: bug-management
description: Capture, triage, plan, fix, and verify product bugs with consistent evidence and tracking. Use whenever a user reports a bug, regression, broken behavior, UI/UX issue, smoke-test finding, or supplies screenshots/videos/logs; also use for requests to describe bugs, organize bug-fix iterations, or update bug status.
---

# Bug Management

Create durable reports before changing product code. Keep raw evidence separate from planning and delivery records so future agents can reproduce intent without reopening the original chat.

## Canonical Locations

- For `frontend_new` bugs, store raw evidence in `frontend_new/bugs_reports/` and track it in `frontend_new/docs/bug-fix-iterations.md`.
- Reuse an existing area-specific `bugs_reports/` folder and tracker when one exists. Do not create a competing tracker for the same area.
- When no scoped tracker exists, create `docs/bug-tracker.md` only after confirming the bug is not frontend-specific.
- Keep screenshots and videos beside the raw report; reference their repository-relative filenames in the report. Do not embed binary evidence in Markdown.
- Update `docs/tasklist.md` only when an iteration is planned, completed, blocked, or materially re-scoped.
- Never alter unrelated raw reports, tracker entries, or `temp.md` unless the user explicitly asks.

## Workflow

### 1. Capture and triage

1. Inspect every supplied image/video before writing conclusions. Inspect the relevant code only enough to identify the surface and reproduce the user-visible symptom.
2. Create or extend one dated raw report using [`references/bug-report-template.md`](references/bug-report-template.md).
3. Assign the next stable `BR-###` identifier from the canonical tracker. Preserve older identifiers such as `TEMP-###` and `FUP-###`; never renumber them.
4. Record facts, not a presumed fix: surface, evidence, actual behavior, expected behavior, reproduction conditions, severity, and acceptance criteria.
5. Use severity consistently:
   - `P0`: data loss, security, or unusable core path.
   - `P1`: material broken or misleading behavior on a core path.
   - `P2`: visible UX/function defect with a workable path around it.
   - `P3`: minor polish or copy issue.
6. Add the issue to the tracker with one state: `Reported`, `Triaged`, `Planned`, `In progress`, `Fixed — verification pending`, `Verified`, `Blocked`, `Duplicate`, or `Won't fix`.

If the user asks only to document or plan bugs, stop after capture/triage. Do not implement a fix.

### 2. Plan iterations

1. Group bugs only when they share a concrete root boundary, component/route, or regression suite. Keep unrelated symptoms in separate iterations.
2. For each iteration, record source IDs, problem, required behavior, acceptance criteria, likely boundaries, dependencies, and exact verification scope.
3. Preserve the user's wording where it defines product intent; make ambiguous terms explicit rather than guessing.
4. Mark each source bug `Planned` with its iteration ID. Do not mark it fixed merely because a plan exists.

### 3. Fix a bug

Use this sequence unless the user explicitly requests a different scope:

1. Reproduce the symptom and add the narrowest regression test that describes the user-visible failure.
2. Run it before implementation and record the expected failure. Reject tests that only prove a convenient proxy when the reported client or platform behaves differently.
3. Write a short implementation plan. Review it for root-cause coverage, affected surfaces, accessibility, and platform-specific behavior; refine before changing code.
4. Implement the smallest root-cause fix. Preserve unrelated behavior and existing user changes.
5. Rerun the new regression, then the relevant unit, lint/type, build, phase, and device suites.
6. For Telegram/native/iOS bugs, browser emulation is supporting evidence only. Run the project device command when configured; otherwise record the exact device-verification exception and leave the issue `Fixed — verification pending`.
7. Add the delivery record to the iteration, including changed behavior, commands/results, evidence paths, and remaining exceptions. Update the state only to the evidence actually obtained.

## Tracking Rules

- Raw report: describe observation and acceptance criteria.
- Central tracker: hold status, priority, iteration, and delivery links.
- Iteration: hold implementation scope and delivery record.
- Test: encode the acceptance criterion, not the prior implementation detail.
- Screenshot matrix or device smoke: validate visual/native behavior that a DOM-only test cannot prove.

If a previous fix passes a browser test but fails in the target client, record it as a false-positive regression gate. Replace the test with one that protects the actual visible or interactive contract; do not claim the bug is fixed.

## Completion Criteria

Call a bug `Verified` only when every acceptance criterion has evidence from the required environments. Use `Fixed — verification pending` when implementation and automated checks pass but a required client/device check is unavailable.

Before handoff, summarize the bug IDs, state transitions, exact tests run, evidence location, and any remaining exception.
