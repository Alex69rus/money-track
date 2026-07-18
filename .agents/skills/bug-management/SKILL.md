---
name: bug-management
description: Capture, triage, plan, fix, and verify product bugs with consistent evidence and one task register. Use whenever a user reports a bug, regression, broken behavior, UI/UX issue, smoke-test finding, or supplies screenshots, videos, or logs.
---

# Bug Management

Capture durable evidence before changing product code. Keep raw evidence separate from task status so future agents can reproduce intent without reopening the chat.

## Canonical locations

- Store every raw report and its screenshots, videos, and logs in the repository-root `bugs_reports/` directory, regardless of whether the affected surface is frontend, backend, or deployment.
- Do not create frontend- or backend-specific report directories. When working with an older report from one of those locations, move it to `bugs_reports/` and update its repository references before continuing.
- `docs/tasklist.md` is the sole task/status register for every area. Do not create a bug tracker, roadmap, iteration document, or other parallel task list.
- Keep screenshots and videos beside the raw report and reference their repository-relative filenames; do not embed binary evidence in Markdown.

## Capture and triage

1. Inspect every supplied image, video, and log. Inspect only enough code to identify the affected surface and reproduce the symptom.
2. Create or extend a dated raw report in `bugs_reports/` using [`references/bug-report-template.md`](references/bug-report-template.md).
3. Assign the next stable `BR-###` by checking `bugs_reports/` and `docs/tasklist.md`. Preserve older IDs; never renumber them.
4. Record facts: surface, evidence, actual behavior, expected behavior, reproduction, severity, and acceptance criteria.
5. Add a `BR-###` row to `docs/tasklist.md` with source, priority, state, acceptance summary, and planned verification. Use exactly one state: `Reported`, `Triaged`, `Planned`, `In progress`, `Fixed — verification pending`, `Verified`, `Blocked`, `Duplicate`, or `Won't fix`.

Severity: `P0` data loss/security/unusable core path; `P1` material core-path failure; `P2` visible defect with workaround; `P3` minor polish/copy.

If the user asks only to document or plan a bug, stop here.

## Plan and fix

1. Group bugs only when they share a concrete route, component boundary, or regression suite. Keep unrelated symptoms separate.
2. In the same `docs/tasklist.md` row, record source IDs, required behavior, acceptance criteria, likely boundaries, dependencies, and exact verification scope. Mark it `Planned`.
3. Reproduce the symptom and add the narrowest regression that protects the user-visible contract. Run it red before implementation when feasible.
4. Implement the smallest root-cause fix without disturbing unrelated behavior.
5. Run the new regression, relevant unit/lint/type/build/phase checks, and required device checks.
6. Record changed behavior, commands/results, evidence paths, and any exception in the same task-list row. Set only the state supported by evidence.

For Telegram/native/iOS behavior, browser emulation is supporting evidence only. Run the project device command when configured; otherwise record the concrete exception and use `Fixed — verification pending`.

## Tracking rules

- Raw report: observation and acceptance criteria only.
- `docs/tasklist.md`: priority, state, implementation scope, delivery record, and verification links.
- Test: acceptance criterion, not the old implementation detail.
- Replace false-positive browser gates with a test of the actual visible or interactive contract.

Before handoff, summarize bug IDs, state transitions, exact tests, evidence paths, and remaining exceptions.
