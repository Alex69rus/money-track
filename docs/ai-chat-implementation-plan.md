# AI Transaction Chat — implementation plan

**Status:** P0/P1 review remediation verified; widget-tool refactor implemented (2026-08-02)

## 0. 2026-08-02 approved widget-tool adjustment

This amendment supersedes earlier deterministic-presentation statements in this document:

1. The agent retrieves authenticated data through one or more existing read tools, then writes the final text response.
2. A response may include one optional widget prepared by exactly one dedicated data-only tool: table, bar chart, line chart, or pie chart. Single values and compact aggregates belong in the agent's text response.
3. Widget tools accept validated, bounded display data only. They do not accept filters, a user identity, SQL, or database access, and they validate schema rather than reconcile model-formatted values with read-tool results.
4. Each widget's `data` argument is a concise Pydantic input model with field descriptions. It omits renderer-owned discriminators such as `kind`, `table_kind`, `measure`, and `dimension`; the backend adds the response `kind` after the selected widget tool validates the data.
5. Tables accept ordered `columns` and matching string `rows`, not hard-coded row variants. Pie widgets receive labels and values only; backend code derives each percentage from the supplied values.
6. `ChatResponseV1` continues to return agent-authored `message` plus an optional visual. The Mini App consumes the corresponding generic table and pie response shapes.

## 1. Scope and approved decisions

This plan delivers the AI Transaction Chat PRD in `docs/prds/prd-ai-chat.md` across the existing FastAPI backend and React Telegram Mini App.

The following architecture decisions were explicitly approved during planning:

1. `POST /api/chat` will evolve from a text-only response to a typed response containing assistant text and, when useful, one optional backend-grounded visual.
2. The browser will retain completed dialogue pairs in a bounded, versioned, user-namespaced local cache and submit a validated, bounded history snapshot with each new question. The backend will not persist a dialogue, session, or chat history.
3. Merchant analysis is out of scope and was removed from the PRD. No merchant field, heuristic, or note-based merchant aggregation will be introduced.
4. The backend, rather than the model, will render every factual assistant sentence, visual title, total, row, point, percentage, and period label from deterministic query results. The model may select from a typed analysis intent, but its free-form output is never sent to the Mini App.
5. The backend will provide deterministic period-comparison and category/tag growth calculations, including explicit zero-denominator and no-data handling.
6. The frontend will use the official shadcn Chart component and its Recharts dependency for the supported chart forms.
7. AI Chat treats transaction amounts as single-currency data: it aggregates matching amounts without conversion or separate-currency analysis. An omitted single analysis period defaults to the inclusive current calendar year, and every factual response states its analysed period.

The first release remains read-only. The frontend will not compute analytical results from transaction records; the backend query tools remain the only data source for all figures and visual data.

## 2. Current-state assessment

### Reusable product patterns

- `AiChatPage` already provides a primary `/chat` route, an accessible distinct-role message timeline, Enter/Shift+Enter handling, pending state, abort-on-unmount, retry control, and confirmation dialog.
- The shared API client already supplies the validated Telegram init-data header and environment-based base URL.
- `AnalyticsPage` establishes the product visual language for cards, money formatting, safe mobile scroll surfaces, loading/error/empty states, and category/tag/time breakdowns.
- Existing backend AI tools use typed Pydantic inputs, fixed SQL fragments, positional parameters, and a context-injected authenticated `user_id`; their tests already seed scoped transactions.

### Gaps to close

| PRD requirement | Current implementation | Plan outcome |
| --- | --- | --- |
| Ephemeral multi-turn dialogue | Client sends a random `sessionId`, but the API ignores it and receives only the latest message. | Send bounded in-memory history; clear it on reset, reload, and route unmount. |
| Visual answers | API returns only `{ "response": string }`; UI only renders text. | Return an optional typed, backend-produced visual and render it as a table, bar, line, or pie chart. |
| Grounded failure UX | A failed request appends a generic assistant “fallback response”, which can be mistaken for an answer. | Retain the user question, show a retryable error, and never create a synthetic analytical answer. |
| Production-facing chat UX | UI exposes session IDs and API/environment implementation details; one suggestion requests unsupported anomaly detection. | Replace with concise feature guidance and supported suggestions; retain no client identity/session fields. |
| Factual assistant content | The LLM currently returns a free-text response, so prompt wording alone cannot prevent invented values or claims. | A server-rendered presentation is the only successful response; model prose, titles, numbers, and rows are discarded. |
| Data grounding for visual values | The LLM currently returns only free text and cannot safely supply chart data. | A dedicated tool queries and serializes every rendered value server-side; the model can select a supported presentation intent but cannot author visual numbers or rows. |
| Single-currency assumption | The former prompt and presentation service rejected aggregate results spanning multiple currencies. | Aggregate matching amounts without conversion or currency splitting, under the approved single-currency assumption. |
| Comparison and growth analysis | Existing aggregation supports one period only, risking model-performed comparisons. | A deterministic comparison service computes totals, deltas, percentages, and category/tag growth for two typed periods. |
| Clarification and scope boundaries | Agent instructions do not fully require clarification, unsupported-scope handling, or visual selection. | Map a closed model directive to server-authored clarification/limitation copy; cover it with mocked-agent/router tests. |

## 3. API and grounding design

### 3.1 Request, lifetime, and input bounds

Replace the current permissive request with a strict Pydantic model and matching TypeScript type:

```json
{
  "message": "How much did I spend on dining last month?",
  "history": [
    { "role": "user", "content": "Compare this month with last month." },
    { "role": "assistant", "content": "Which measure should I compare?" }
  ]
}
```

- `role` is limited to `user` or `assistant`; `content` is plain text with one to 2,000 characters.
- `history` holds at most 12 completed messages and at most 12,000 characters. It alternates user/assistant role, starts with `user`, and ends with `assistant`; the submitted `message` is the next user turn.
- The API rejects unknown fields, invalid role/order, blank values, oversized messages, excessive count, and excessive total history size with a normal validation response. Backend validation is authoritative; the frontend mirrors limits only to give immediate feedback.
- The frontend includes only completed messages from this mounted route: no welcome copy, pending marker, error text, synthetic fallback, `userId`, `sessionId`, or timestamp.
- The backend treats all history and message content as untrusted model input. It never uses it for identity, SQL, tool authorization, or a query parameter without its existing typed/parameterized tool boundary.
- The backend obtains identity exclusively from `get_current_user_id`; it neither accepts nor exposes a client identity field.
- React state is intentionally not persisted (no storage, URL state, or server dialogue record). Reset and route unmount abort active work and discard history; browser reload starts a new component instance.

### 3.2 Exact response contract

The API returns `ChatResponseV1` and no longer accepts or emits compatibility aliases:

```ts
type ChatResponseV1 = {
  version: "v1";
  kind: "answer" | "clarification" | "limitation";
  message: string; // server-rendered template only
  visual: ChatVisualV1 | null;
};

type PeriodV1 = {
  label: string; // server-derived inclusive business-timezone range or “All time”
  fromDate: string | null; // YYYY-MM-DD
  toDate: string | null; // YYYY-MM-DD
};

type ChartValueV1 = { value: string; display: string };
type ChartSeriesValueV1 = { label: string; value: ChartValueV1 };
```

`value` is an exact retrieved decimal string. `display` is server-formatted and is the sole textual fact shown in the UI. Charts may convert an already-validated `value` to a finite JavaScript number for positioning only; the frontend never sums, compares, rounds, labels, or otherwise derives a financial fact.

Widget payloads are presentation-generic: widget input never contains an analysis dimension, measure, business-specific field, or renderer discriminator. A chart value is `{ value, display }`, so money, counts, and other retrieved numeric metrics use the same contract. Named value lists let the agent choose one or more truthful series for bar and line charts. `kind` remains a backend-added response discriminator only, so the frontend can select the renderer; it is never an LLM tool argument.

`ChatVisualV1` is a closed response union. The selected widget tool adds its `kind`; the agent supplies validated data after its read-tool calls.

```ts
type ChatVisualV1 =
  | {
      kind: "table";
      title: string;
      period: PeriodV1;
      columns: string[];
      rows: string[][];
    }
  | {
      kind: "bar";
      title: string;
      period: PeriodV1;
      items: Array<{ label: string; values: ChartSeriesValueV1[] }>;
    }
  | {
      kind: "line";
      title: string;
      period: PeriodV1;
      points: Array<{ label: string; values: ChartSeriesValueV1[] }>;
    }
  | {
      kind: "pie";
      title: string;
      period: PeriodV1;
      items: Array<{ label: string; value: ChartValueV1; share: ChartValueV1 }>;
    };
```

The backend response model uses equivalent Pydantic discriminated unions. Widget input models expose only the fields the agent needs, with concise descriptions; the backend supplies the discriminator. It validates table-row width and calculates pie percentages from the supplied values. The frontend validates the discriminator, required fields, finite chart values, and cardinality before rendering. It rejects a malformed 2xx response as a retryable error.

Cardinality and ordering are part of the contract:

- tables contain one to eight columns and at most 20 matching-width rows;
- pie charts contain at most 10 items; bar charts accept all retrieved items and use one or more consistently named series, scrolling only within their card when needed;
- line charts contain at least two chronological points with one or more consistently named series and remain full-width without horizontal scrolling; their X axis may omit intermediate labels to stay readable;
- a response contains zero or one visual. No visual is returned for no-data, clarification, or limitation responses.

### 3.3 Deterministic analyses and allowed presentations

Extract common, typed, user-scoped read-query services from the existing list and aggregate function tools. These services retain fixed SQL identifiers, fixed grouping expressions, and positional parameters; no Agents-decorated tool calls another tool, and no tool accepts SQL.

The only allowed query/presentation combinations are:

| Deterministic analysis | Optional visual | Server-rendered message/title |
| --- | --- | --- |
| Expense, income, balance, or transaction-count aggregate for one period | None | Concise text with the resolved period. |
| Matching transaction lookup | `table` (`transactions`) | Result-count and resolved-period template. |
| Expense/income/balance category or tag breakdown | `bar` or `table` (`breakdown`) | Dimension/metric/period template. |
| Expense category or tag composition | `pie` | Agent-selected labels and period; the widget computes each share from the supplied values. |
| Income and expense trend grouped by month, quarter, or year | `line` | Trend/period template. |
| Two-period total comparison | None | Concise text with current, previous, delta, percentage/zero-baseline, and both periods. |
| Two-period category or tag growth | `table` or `bar` | Agent-selected display columns or labels from retrieved comparison data. |

Add category-name grouping to the existing fixed grouping allowlist so a category visual has user-facing labels. Retain tag and business-timezone date grouping. Never add merchant grouping.

For comparison, a typed request carries two non-overlapping, inclusive `PeriodV1` ranges plus the same validated non-date filters. The server independently queries both periods, computes `current - previous`, and computes percentage change only when the previous magnitude is non-zero. A zero baseline sets `changePercent` to `null` and uses a deterministic “percentage change is unavailable because the previous period was zero” template. No matching records produce a deterministic no-data response. The model never subtracts, divides, ranks, or formats comparison data.

Aggregate, breakdown, trend, comparison, and visual computation treat matching transaction amounts as one currency. Do not convert, split, or reject results because of currencies; the product currently assumes a single-currency user.

### 3.4 Agent boundary and response assembly

The Agents SDK remains the natural-language interpreter, but no free-form Agent output crosses the API boundary:

1. Pass validated history and the current user message as untrusted dialogue content, with `ChatAgentContext.user_id` and a request-local empty `presentation` slot.
2. Replace `ChatAgentResponse` with a strict `AgentDirective` output type: `presented`, `ask_period`, `ask_comparison_periods`, `ask_dimension`, `decline_write`, `decline_external_data`, `decline_advice`, or `decline_unsupported`. It has no text, title, number, value, visual, or extra fields.
3. Add a closed `present_analysis` function tool. It accepts only typed filters, an analysis enum, an allowed grouping/period/comparison enum, and an allowed presentation enum. It invokes the deterministic services, builds `ChatResponseV1`, and places it in the request-local context. It does not accept model-written labels, titles, messages, values, rows, or SQL.
4. On `presented`, return only the context presentation. A missing presentation is a logged provider/protocol failure and becomes the existing retryable unavailable response. For every other directive, map the enum to a fixed server clarification/limitation template with `visual: null`.
5. The prompt requires `present_analysis` before `presented`, asks for a directive rather than prose, demands clarification for material ambiguity, and forbids aggregation outside that tool. It informs the model of scope but is not a security control.

This fails closed: a fake or real model response that contains a fabricated number/title is rejected by `AgentDirective` validation or discarded during response assembly. Default Agents tracing and existing error logging remain in place; raw Telegram credentials are not logged and no bespoke telemetry is introduced.

## 4. Backend implementation steps

1. **Contract models and router**
   - Add typed history, `ChatResponseV1`, visual discriminated-union, and `AgentDirective` schemas under the AI Chat service/schema boundary.
   - Update `ChatRequest`, route OpenAPI response typing, and router tests. Remove support for ignored `userId`, `sessionId`, and timestamp fields after the frontend switches.
   - Preserve the 503 provider failure contract, but return no fictional assistant content.

2. **Refactor deterministic read services**
   - Extract the existing tool query/mapping logic into reusable internal functions that accept `user_id`, typed filters, ordering, and pagination.
   - Retain fixed SQL identifiers, whitelists, and positional parameter bindings; add category-name grouping only through a fixed expression.
   - Treat aggregate/visual results as single-currency data without conversion or currency splitting, add typed no-data results, and provide a two-period comparison service that calculates deltas and zero-baseline percentage behavior. Keep raw transaction listing read-only and currency-preserving.

3. **Grounded presentation tool and agent context**
   - Extend `ChatAgentContext` with request-local `ChatResponseV1` state, never a database-backed session.
   - Implement `present_analysis` as the sole producer of success responses; it supports only the enumerated transaction table, breakdown, comparison, bar, trend-line, and pie-chart combinations.
   - Render every message/title/period/row/point from server templates and deterministic results. Enforce the stated output limits and ordering before serializing the response.
   - Update prompt, SDK input construction, strict no-prose `AgentDirective`, and final response assembly so free-form model output is never delivered. Default an unspecified single analysis period to the inclusive current calendar year; require the server-rendered response to state its analysed period.

4. **Backend regression/security tests**
   - Extend unit/router tests for strict request validation, auth-owned identity, response shape, history forwarding, provider failures, malformed history, and an invalid/fabricated model response that must fail closed.
   - Extend integration tests for every visual shape and data source, current-year defaulting, period labels in single and comparison results, no-data and zero-baseline comparisons, category labels, tag values, single-currency aggregation, and no mutations.
   - Reuse two-user fixtures to prove all visual/table outputs and clarification follow-ups remain scoped to user A despite guessed IDs, explicit requests for user B, prompt injection in messages, history, and stored transaction note/tag text.
   - Retain/extend SQL-prohibition and injection regressions around every SQL-using tool. Assert forbidden statements and malformed inputs cannot modify rows, schema, roles, session state, or disclose database internals.

## 5. Frontend implementation steps

1. **Typed API adapter**
   - Replace the permissive response-text extractor and untrusted request fields in `src/services/api/chat.ts` with exported strict request/response/visual types plus a shape validator.
   - Send only `{ message, history }` through the shared authenticated API client. Treat malformed 2xx bodies as retryable UI errors, not as assistant content.

2. **State and request lifecycle**
   - Model messages as completed user/assistant entries plus an internal pending request. Build history from completed entries only.
   - On send, append one user message and a pending assistant bubble; disable duplicate sends and suggestions while the request is outstanding.
   - On failure, remove/replace the pending marker without fabricating a response, retain the original user message, show an inline `Alert` with retry, and retry the same history without duplicating that user message.
   - On Start new (the existing confirmation dialog), abort in-flight work and clear messages/history/error/composer plus the local conversation cache. Unmounting `/chat` aborts in-flight work but retains completed local pairs; pending/error/retry state is never persisted. No session ID appears in UI or request.

3. **Message and visual presentation**
   - Refactor `AiChatPage` into small testable chat message, composer, and visual-renderer components while retaining the existing primary route and app shell.
   - Replace developer-facing copy with concise user-facing scope guidance and only supported suggestion prompts (period/category/tag/transaction examples).
   - Render the server-produced assistant message in a clearly distinct bubble; below it render one optional visual card with its server-derived title and period.
   - Use existing Card, Alert, Button, Badge, Table, and Textarea primitives. Add the official shadcn `chart`, `field`, `input-group`, `empty`, and `spinner` components only after CLI preview/review; use Recharts via the installed chart primitive rather than a bespoke chart implementation.
   - Support every visual union form: transaction tables in a captioned horizontally-scrollable table, bars and pies with accessible labels/tooltips, and trends with an accessible line chart. Provide a semantic text/table equivalent for chart values so a visual is not the sole carrier of facts.
   - Constrain charts/tables to one-column mobile cards. Keep line charts full-width with sparse X-axis labels; give wide bar charts a card-scoped horizontal scroll region with a readable minimum bar width. Preserve a fixed measurable chart height and the existing safe-area-aware page scroll container. Keep composer focused and visible above Telegram keyboard changes using the established shell behavior.
   - Preserve text-only operation when `visual` is omitted, no data exists, a visual cannot be safely rendered, or the host is a normal browser.

4. **Frontend tests and QA harnesses**
   - Replace the existing session-ID and local-fallback assertions with behavior-visible tests for request payload, history order, one user-message per retry, pending/abort behavior, reset and local cache lifecycle, route/reload restoration, keyboard send, Shift+Enter, error/retry, and inaccessible multimodal controls.
   - Add renderer tests for each visual kind, period/title/value rendering, table semantics, chart’s equivalent textual facts, responsive/capped data, malformed visual response failure, and no rendering of data after an aborted/reset request.
   - Update Phase 4 browser QA to intercept the new request/response contract and prove each critical chat interaction. Add visual response assertions rather than mocking only text.
   - Extend mobile QA with a 390×844 DPR 3 screenshot and keyboard-focus/reachability assertions for a long timeline, a chart/table card, pending state, error/retry, and Start new.

## 6. Acceptance and test matrix

| Evidence | What it proves |
| --- | --- |
| Backend unit/router tests | Auth determines user; extra/invalid request fields are rejected; bounded history is forwarded as content; 503 remains clear and retryable; no client session/identity is trusted. |
| Backend AI-tool integration tests using two users | Query, table, bar, line, and pie outputs contain only the authenticated user’s rows and values; current-year defaults, stated periods, tag/category, and single-currency aggregation behavior are correct. |
| Backend mutation/SQL-safety regression tests | Injection-shaped user/history/note/tag/model values cannot execute prohibited statements, bypass parameterization/scoping, mutate records, or reveal DB details. |
| Agent behavior tests with a deterministic fake/model fixture | Ambiguous questions map to a concise server clarification; unsupported/write/advice/external-data requests map to a server limitation; a fake fabricated number/title is rejected or discarded, and every delivered fact comes from deterministic presentation output. |
| Frontend Vitest | Timeline roles, typed API contract, request history, retry without duplication, reset/unmount/reload clearing, error recovery, each visual renderer, accessibility semantics, and text-only fallback all work. |
| Phase 4 Playwright QA | Browser-level send/Enter/Shift+Enter, pending disablement, reset confirmation, error retry, visual response rendering, and intercepted payload/response contract work together. |
| Phase 5 + mobile QA screenshots | Chat remains a primary Telegram destination; its composer, timeline, visual card, and actions stay above safe areas and remain reachable at 390×844 DPR 3. |
| Real Telegram smoke test (iOS, Android, Desktop when available) | Native safe-area, fullscreen fallback, keyboard positioning, and browser-vs-host behavior are usable beyond the synthetic browser fixture. If no configured device tunnel exists, record that concrete exception rather than claiming the smoke test ran. |

## 7. Required verification commands

Run only after the code and tests are in place, stopping to classify/fix a failure before moving on:

```sh
cd backend_new && uv run ruff format .
cd backend_new && uv run ruff check .
cd backend_new && uv run mypy .
cd backend_new && uv run pytest -q

cd frontend_new && npm run lint
cd frontend_new && npm run typecheck
cd frontend_new && npm test
cd frontend_new && npm run build

npm run qa:phase4
npm run qa:phase5
scripts/run_frontend_mobile_qa.sh
```

For backend integration validation, use the repository’s health-polled `run-e2e-tests` workflow with explicit development environment and test database variables. Run the same root-owned QA command with escalation if sandbox restrictions prevent local binding or `uv` cache access; do not alter product code to work around the environment.

## 8. Delivery checklist

- [x] PRD-to-plan review found no critical unmet requirement after the required review loop.
- [x] API contract has a single source of truth, strict validation, and compatibility tests.
- [x] All delivered factual text, titles, periods, values, and visual rows/points originate solely in a user-scoped deterministic backend presentation service.
- [x] Dialogue is absent after new dialogue, route change, and reload; no storage/session persistence exists.
- [x] Read-only, scoping, invalid-model-output, current-year defaulting, single-currency aggregation, no-data, ambiguity, and unsupported-scope cases have automated evidence.
- [x] Frontend checks, affected browser/mobile QA, and backend checks are green; the missing real-device condition is recorded below.
- [x] Reusable findings are captured in the scoped `GUARDRAILS.md` files after the iteration.

## 9. Delivery record — 2026-07-26

- The required PRD review subagent completed two review passes and ended with “no critical issues.” Merchant analysis was explicitly removed from the PRD before implementation.
- Backend verification passed: Ruff format/check, mypy, the full unit/integration suite, and the health-polled integration suite. The two production-auth checks remain skipped because `PRODUCTION_BASE_URL` is not configured.
- Frontend verification passed: lint, typecheck, 19 Vitest files / 47 tests, production build, final Phase 4/Phase 5 browser QA, and the full four-device/two-theme mobile matrix. The final iPhone SE AI Chat screenshots are in `frontend_new/.codex-tmp/mobile-qa/2026-07-26T18-16-23-042Z/`.
- Exception: the real Telegram iOS/Android/Desktop smoke test could not run because `TELEGRAM_DEVICE_NGROK_DOMAIN` is not configured. Browser fixture evidence is supporting, not a claim of native-client validation.

## 10. Post-implementation review amendment — 2026-07-26

An independent review found no P0 data-scope escape, but found P1 lifecycle, ordering, tooltip-grounding, and supported-analysis gaps. All P1 remediation is now verified by a second independent review: there are no P0/P1 findings. The review evidence is captured in `bugs_reports/ai-chat-review-findings-2026-07-26.md` and the delivery record for AI-CHAT-06 in `docs/tasklist.md`.

One P2 decision remains tracked as AI-CHAT-07: whether comparison growth must be database-complete beyond 100 groups per period, or whether the product should state an explicit capped scope. This needs an architecture/product decision; no silent behavior change was made.
