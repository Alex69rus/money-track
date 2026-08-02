# Development Task List

Use this file only for approved, active multi-iteration work that needs decomposition, status tracking, or handoff. Keep raw screenshots, logs, and observation-only reports in `bugs_reports/`.

## Active Task Register

| ID  | Source / evidence | Priority | State | Summary |
| --- | ----------------- | -------- | ----- | ------- |
| BR-018 | `bugs_reports/ai-chat-widget-limits-2026-08-02.md` | P2 | Verified | Removed arbitrary line/bar widget caps, added card-scoped bar scrolling, and disclosed the table row limit to the agent. |
| AI-CHAT-07 | `bugs_reports/ai-chat-review-findings-2026-07-26.md` (BR-013) | P2 | Planned | Decide how a comparison must rank growth when either period has more than 100 category/tag groups. |

<!-- Add active multi-iteration work here. -->

## BR-018 — Usable extended AI Chat charts

Source: `bugs_reports/ai-chat-widget-limits-2026-08-02.md`.

### Problem

Current response schemas impose arbitrary 12-point line and 10-bar limits. A 24-month requested trend is rejected even though the read tool returns up to 100 grouped values, and the model can promise a table longer than its undisclosed 20-row limit.

### Required behavior

- Remove the widget-level line-point limit; preserve a non-scrollable, responsive line chart with sparse readable axis labels.
- Allow bar-chart item counts returned by one read-tool call. At 20 items, use horizontal scrolling only inside the chart card and keep a usable bar width.
- State the table's 20-row maximum in the model-facing field description.

### Acceptance criteria

- Backend and frontend accept a 24-point line chart and a 20-item bar chart.
- The line chart has no horizontal scroll region; its chart card never creates page-level horizontal overflow.
- At 390×844 DPR 3, a 20-item bar chart scrolls horizontally within its own card, retains server-provided tooltip/display values, and does not move the fixed chat header or composer.
- The model-facing table schema includes the 20-row limit in its `rows` description.

### Plan

1. Align the Pydantic widget inputs, response contracts, and frontend parser limits with the read tool's bounded result size; add direct regressions for 24 line points and 20 bars.
2. Give bar charts a card-scoped scroll container and a minimum per-bar width; keep line charts full-width with sparse X-axis labels and no horizontal scroll.
3. Extend component and 390×844 browser/mobile QA fixtures to prove scroll ownership, visual reachability, tooltip facts, and absence of page-level overflow.
4. Run backend static/full deterministic checks, frontend lint/type/unit/build checks, affected Phase QA, and mobile QA; inspect the generated phone screenshots.

### Delivery record — 2026-08-02

- Removed the 12-point line and 10-item bar schema/parser limits. The read tool remains independently bounded to 100 results per request.
- Added explicit `Up to 20 display rows` guidance to the table widget's model-facing schema.
- Bar charts now reserve 72px per item, scroll only inside the chart card, and use a fixed 18rem height; line charts remain full-width with sparse X-axis labels and no scroll region.
- Added backend, API-parser, component, Phase 4, and mobile regressions for 24 line points, 20 bars, card-only scrolling, server display facts, fixed controls, and page-overflow prevention.
- Verification: backend format/lint/types and focused AI Chat tests — 18 passed; health-checked deterministic backend suite — passed, 2 expected skips; frontend lint/typecheck/tests — 19 files / 55 tests passed; build — passed; Phase 4 — all passed at 390×844 DPR 3; focused iPhone 12 Pro mobile QA — dark/light passed and screenshots inspected at `frontend_new/.codex-tmp/mobile-qa/2026-08-02T09-19-45-414Z`.
- Remaining exception: a final full mobile-matrix terminal run ended without a report after its runner exited; a prior full-matrix run passed before the test-only screenshot capture adjustment. The final product behavior was independently verified on the required 390×844 dark/light profile.

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

## AI-CHAT-01 — Typed, user-scoped chat and deterministic visual data

Source: `docs/prds/prd-ai-chat.md`; user-approved structured visual response, ephemeral client-passed history, backend-owned factual presentation/comparison, and shadcn/Recharts decisions (2026-07-26).

State: Verified.

### Goal

Expose a strict `POST /api/chat` contract whose factual message and optional visual data are produced only by backend-scoped, parameterized read queries.

### Scope

- Replace ignored client identity/session fields with bounded typed history and a strict response envelope.
- Extract reusable read-query services from AI Chat tools; add category labels, period derivation, multi-currency aggregate refusal, deterministic two-period comparison, and a closed `present_analysis` tool.
- Support transaction/breakdown/comparison tables, bars, lines, and category-share payloads without dynamic SQL or merchant analysis.

### Acceptance criteria

- The backend determines user identity from validated Telegram auth and returns only that user’s data.
- Every delivered factual sentence, visual point, row, total, title, period, and display label originates in a deterministic, scoped presentation result.
- Aggregate/visual requests spanning multiple currencies are safely declined without conversion or a fabricated total.
- Router, service, and integration tests prove strict request/response validation, visual/factual grounding, comparisons, and zero-baseline behavior.

### Plan

1. Define Pydantic request/history, response/visual discriminated-union, and no-prose Agent-directive schemas; update the API route.
2. Refactor list/aggregate queries into internal typed services; add the currency guard, fixed category-name grouping, and deterministic comparison service.
3. Implement the request-local `present_analysis` response handoff and integration tests for every allowed presentation.

### Delivery record

- Added the strict v1 request/history/response/visual schemas, user-scoped query service, deterministic presentation tool, exact-currency guard, and comparison/zero-baseline logic. The agent can only return an enum directive; all factual text and visual data are server-rendered.
- Verification: `cd backend_new && uv run ruff format . && uv run ruff check . && uv run mypy . && uv run pytest -q` — passed (2 production-auth checks skipped because `PRODUCTION_BASE_URL` is unset); `uv run pytest -q tests/integration/test_ai_chat_presentation_tool.py` — passed.
- Remaining exception: none.

## AI-CHAT-02 — Grounded dialogue behavior and security proof

Source: `docs/prds/prd-ai-chat.md`; depends on AI-CHAT-01.

State: Verified.

### Goal

Preserve a helpful multi-turn analytical dialogue while proving it cannot authorize, modify, or leak data.

### Scope

- Pass only bounded, untrusted current-view history to the Agents SDK.
- Strengthen instructions for clarification, scope limits, no-data, period disclosure, tool-only facts, visual selection, and multi-currency refusal; map only enum directives to server templates.
- Preserve default tracing and existing logging without a new telemetry system.

### Acceptance criteria

- Ambiguous prompts produce a concise server-authored clarification and a following answer uses only in-view history.
- Two-user, guessed-ID, malformed-input, prompt-injection, stored-note/tag, and LLM-generated-input cases cannot retrieve, infer, change, or confirm another user’s data.
- SQL-injection/prohibited-operation regressions show no mutation, schema/permission/session change, or database-detail disclosure.
- A fake model-provided fabricated number or title cannot reach the client.

### Plan

1. Update request-to-Agent input assembly, agent context/prompt, and strict directive-only response assembly.
2. Add deterministic agent/router tests for clarification, out-of-scope responses, context handling, missing presentation, and fabricated-output rejection.
3. Expand AI tool integration tests for two-user isolation and SQL/read-only guarantees.

### Delivery record

- Added bounded alternating history validation, request-local agent presentation state, no-prose `AgentDirective`, clarification/limitation templates, and fail-closed provider handling. The presentation integration suite proves authenticated-user scoping and rejects model-authored fact fields.
- Verification: router and presentation integration tests, plus the full backend suite, passed.
- Remaining exception: the two existing production-auth checks require a configured `PRODUCTION_BASE_URL`.

## AI-CHAT-03 — Chat state, typed transport, and recovery UX

Source: `docs/prds/prd-ai-chat.md`; depends on AI-CHAT-01.

State: Verified.

### Goal

Make the primary AI Chat view submit its ephemeral dialogue correctly and recover clearly without pretending a failed request is an answer.

### Scope

- Replace permissive response extraction and `userId`/`sessionId`/timestamp payload fields with typed request/response parsing.
- Keep only completed messages in React memory; abort and discard on reset, unmount, or reload.
- Preserve timeline, Enter/Shift+Enter, pending, confirmation, and retry behavior without duplicate user entries.

### Acceptance criteria

- Send and retry pass the exact expected history, and retry does not append a second copy of the failed user message.
- Start new, route change, and reload leave no active dialogue, session ID, local storage record, or stale response.
- Request failure shows a retryable error while retaining the question, not a generic assistant “answer”.

### Plan

1. Implement strict frontend API types and response validation.
2. Refactor Chat page state into completed-message/history and request-lifecycle helpers.
3. Replace development-facing copy and unsupported suggestion prompts with scoped user guidance.
4. Add Vitest coverage for payloads, retry, abort/reset/unmount, keyboard behavior, and malformed payload errors.

### Delivery record

- Replaced session/client identity payloads with strict typed transport; completed-message-only history, abort/reset cleanup, pending state, failure/retry without a synthetic answer, and no duplicate retry message are implemented.
- Verification: `cd frontend_new && npm test` — 19 files / 47 tests passed; `npm run qa:phase4` — FR-023 through FR-027 passed.
- Remaining exception: none.

## AI-CHAT-04 — Accessible, Telegram-safe visual responses

Source: `docs/prds/prd-ai-chat.md`; depends on AI-CHAT-01 and AI-CHAT-03.

State: Verified.

### Goal

Render each backend-grounded visual form in the message timeline without making a graphic the sole representation of facts.

### Scope

- Add and review needed official shadcn chart/form/feedback primitives.
- Render table, bar, line, and category-share cards with server-derived title and period.
- Provide table/text equivalents, captions, labels, tooltips, mobile limits, and safe-area/keyboard-compatible composition.

### Acceptance criteria

- A text-only response remains usable; every visual union renders valid facts and a semantic equivalent.
- Long tables/charts remain scrollable, visible, and reachable at 390×844 DPR 3 with Telegram host insets and keyboard changes.
- Unit and browser assertions prove no visual appears after request abort/reset and malformed visual data is never rendered as fact.

### Plan

1. Install/inspect only the required official shadcn components and compose visual renderer subcomponents.
2. Add renderer/accessibility/unit tests for every visual kind and malformed/no-data cases.
3. Extend the browser and mobile QA fixtures/screenshots with representative visual responses.

### Delivery record

- Added shadcn/Recharts visual rendering for server-grounded table, bar, line, and category-share payloads, with semantic table/text facts. The client rejects malformed visual payloads rather than rendering them. Resolved BR-008 by preventing initial welcome-message auto-scroll from moving the iPhone SE AI Chat page into Telegram’s top control inset.
- Verification: visual/component and API contract Vitest coverage passed; `scripts/run_frontend_mobile_qa.sh` passed all dark/light iPhone 12 Pro, iPhone 15, iPhone 15 Pro Max, and iPhone SE profiles. Inspected `frontend_new/.codex-tmp/mobile-qa/2026-07-26T18-16-23-042Z/{dark,light}/iphone-se/ai-chat.png`.
- Remaining exception: native-device smoke test is unavailable because `TELEGRAM_DEVICE_NGROK_DOMAIN` is not configured.

## AI-CHAT-05 — End-to-end verification and handoff

Source: `docs/ai-chat-implementation-plan.md`; depends on AI-CHAT-01 through AI-CHAT-04.

State: Verified.

### Goal

Deliver evidence that the integrated feature is secure, grounded, responsive, and maintainable.

### Scope

- Run backend format/lint/type/unit/integration checks and frontend lint/type/test/build checks.
- Run Phase 4/Phase 5 and mobile QA; use the health-polled local backend workflow for API integration validation.
- Smoke test supported real Telegram clients when the configured device tunnel exists; otherwise record the specific environment exception.

### Acceptance criteria

- All required automated checks are green, with failures classified before any code change.
- Test output explicitly covers data isolation/read-only/injection safety, visual grounding, dialogue lifetime, and mobile interaction.
- Scoped `GUARDRAILS.md` files contain only reusable lessons from this iteration.

### Plan

1. Run focused tests after each stage, then full affected suites after integration.
2. Run browser/mobile harnesses and inspect generated screenshots.
3. Record commands, pass/fail/skip counts, exceptions, changed files, and reusable guardrails in the final delivery record.

### Delivery record

- PRD review was performed by the required subagent until it reported no critical issues. Merchant analysis was removed from the PRD by product direction; the approved v1 design, tests, and architecture are recorded in `docs/ai-chat-implementation-plan.md`.
- Verification: backend format/lint/type/full tests passed with 2 production-only skips; health-polled local integration suite passed; frontend lint/typecheck/19-file 47-test suite/build passed; final Phase 4 and Phase 5 browser QA passed; final mobile QA passed.
- Remaining exception: no real Telegram device/tunnel is configured. Vite reports an existing 500 kB chunk-size warning for the Recharts-enabled production bundle; it is documented in `PAPERCUTS.md` and is not a failed check.

## AI-CHAT-06 — Correct lifecycle, ordering, and supported breakdown analyses

Source bugs: BR-009, BR-010, BR-012.

State: Verified.

### Goal

Keep continued chat usable and make every planned category/tag visual rank and filter the requested financial measure correctly.

### Required behavior

- Submit only the newest complete user/assistant history pairs within the server's entry and character limits; do not turn a failed user bubble into invalid new-prompt context.
- Rank expense and growth outputs by displayed magnitude before applying visual caps.
- Support deterministic, user-scoped spending, income, and balance category/tag breakdowns.

### Acceptance criteria

- Component tests prove new send after a failure and after more than six completed turns sends valid bounded history.
- Integration tests prove magnitude ordering/top-ten retention and all supported flow/dimension breakdowns.

### Delivery record

- Rebuilt client history from the newest complete user/assistant pairs, capped it at 12 messages / 12,000 characters, excludes a failed user bubble from a different follow-up, and restores that same bubble after a successful retry. Added regressions for both paths.
- Changed grouped aggregate ordering to descending absolute value; expanded deterministic category/tag presentation to spending, income, and balance. Comparison queries now use scoped expense currencies and collect the largest 100 period groups before ranking change magnitudes.
- Verification: focused frontend lifecycle tests — 7 passed; focused backend presentation tests — 4 passed; full backend and frontend suites plus Phase 4 browser QA — passed.
- Remaining exception: none.

## AI-CHAT-07 — Server-owned chart facts and complete contract evidence

Source bugs: BR-011, BR-013.

State: Planned.

### Goal

Ensure charts never surface a client-derived monetary string and complete the critical contract/trend/agent tests promised by the approved plan.

### Required behavior

- Tooltips map chart geometry back to server `display` strings.
- Response validation mirrors contract enums/cardinalities; trend buckets are chronological requested-period data.
- Choose the data/operational behavior for comparison growth when one period has more than 100 groups: a database-side full comparison or an explicit product cap.

### Acceptance criteria

- Component tests prove tooltip text preserves server currency displays.
- Backend/unit/integration tests prove contract and deterministic edge behavior.

### Delivery record

- Resolved BR-011: bar, line, and category-share tooltips now map chart geometry to server-provided money displays. Frontend validation mirrors the supported visual contracts and breakdown/comparison caps; trend selects chronological buckets and supports month/quarter/year grouping.
- Remaining decision: comparison growth is correct for the largest 100 groups from each period, but not provably for a lower-total group outside both caps. Do not silently choose unbounded retrieval or a user-visible cap without product/architecture direction.

## AI-CHAT-08 — Phone-first AI Chat composition

Source: User review and `bugs_reports/ai-chat-mobile-composition-2026-07-26.md` (BR-014–BR-016).

State: Verified.

### Goal

Make AI Chat feel like a focused, native chat surface in the existing Money Track theme: persistent compact controls and composer, with the conversation itself using the available screen.

### Scope

- Remove suggestions, verbose headings/help text, visible role labels, the Message label, and the mobile-visible keyboard shortcut hint.
- Use a small icon-only new-chat action, a compact title, a rounded compact composer, and bubble direction rather than labels for message hierarchy.
- Give `/chat` a route-specific internal transcript scroll surface while preserving AppShell scroll behavior on every other route and the existing Telegram safe-area/navigation behavior.
- Preserve all existing send, multiline, pending, retry, reset, abort, accessibility, and server-grounded visual behavior.

### Acceptance criteria

- At 390×844 DPR 3, chat controls remain visible while a long timeline scrolls independently; the app shell does not scroll on `/chat`.
- The removed visual chrome is absent while accessible labels, dialog copy, keyboard semantics, and message test semantics remain available.
- Focus/keyboard viewport changes keep the composer usable and do not cause the outer shell to scroll.
- Targeted unit/browser checks and the complete frontend verification suite pass; mobile QA screenshots are visually inspected in both themes.

### Plan

1. Capture the reported evidence and add regressions for the intended information hierarchy and `/chat` scroll ownership.
2. Update `AppShell` and `AiChatPage` with a route-scoped no-outer-scroll layout, minimal header, transcript-only scroll surface, and compact accessible composer.
3. Extend phase/browser and mobile QA to prove fixed controls, inner scroll behavior, removed chrome, and keyboard-safe composition; inspect generated screenshots.
4. Run frontend lint, typecheck, unit tests, build, Phase 4, and mobile QA; record any real-device exception.

### Delivery record — 2026-07-26

- Replaced the card-and-form presentation with a compact header, plus-only accessible new-chat control, transcript-only scroll surface, and rounded icon-send composer. Removed the introductory/suggested copy, structural labels, visible role labels, timestamps, and mobile-visible keyboard shortcut hint.
- Made AppShell disable only its `/chat` page scroll; other routes retain their existing scroll behavior. The input opts out of the shell's focus-positioning scroll because the chat flex layout keeps its composer above a resized keyboard viewport.
- Added unit, Phase 4, and mobile regressions for absent chrome, icon-only controls, outer/inner scroll ownership, fixed control positions, safe-area/navigation clearance, and keyboard resizing. Reviewed dark iPhone 12 Pro and light iPhone SE screenshots from the final mobile run.
- Verification: `cd frontend_new && npm run lint && npm run typecheck` — passed; `npm test` — 19 files / 51 tests passed; `npm run build` — passed (existing Recharts chunk-size warning only); `scripts/run_frontend_phase_qa.sh phase4` — FR-023–FR-027 passed; `scripts/run_frontend_phase_qa.sh phase5` — FR-028, FR-030, FR-031, FR-033, and FR-040 passed; `scripts/run_frontend_mobile_qa.sh` — all dark/light iPhone 12 Pro, iPhone 15, iPhone 15 Pro Max, and iPhone SE profiles passed.
- Remaining exception: a real Telegram device smoke test was not run because `TELEGRAM_DEVICE_NGROK_DOMAIN` is unset.
