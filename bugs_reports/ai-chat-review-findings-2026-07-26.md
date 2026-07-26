# AI Chat implementation review findings — 2026-07-26

Scope: Post-implementation review of the AI Chat backend, frontend, tests, PRD, and approved implementation plan.

This report records observed defects only.

## Evidence

| File | Surface | Highlight |
| --- | --- | --- |
| `docs/prds/prd-ai-chat.md` | AI Chat requirements | Grounding, flexible analysis, and acceptance requirements under review. |
| `docs/ai-chat-implementation-plan.md` | Approved design | Bounded history, server-owned facts, ordered visuals, and test commitments. |
| `frontend_new/src/pages/AiChatPage.tsx` | Chat lifecycle | History can exceed API bounds or end on an unpaired failed user turn. |
| `backend_new/app/services/ai_chat/presentation_tool.py` | Visual analyses | Expense magnitude ordering and income/balance breakdown support are incomplete. |
| `frontend_new/src/components/ai-chat/ChatVisual.tsx` | Charts | Default tooltips format client-converted numeric values. |

## BR-009 — Chat history becomes invalid after a failure or long conversation

Priority: P1

Evidence: post-implementation review of `frontend_new/src/pages/AiChatPage.tsx` and `backend_new/app/api/routes/ai_chat_router.py`.

### Actual

The frontend sends all history-eligible messages without enforcing the API's 12-message / 12,000-character limit. After a failed request, the visible failed user message remains history-eligible without an assistant reply, so the next request's history ends with `user` and receives a 422 response.

### Expected

Each request contains only the newest valid, completed user/assistant pairs within API bounds. A failed visible user message remains retryable but is not used as completed dialogue context for a later new prompt.

### Reproduction

1. Submit a prompt that receives a failed response.
2. Enter a different prompt rather than pressing Retry.
3. Observe the backend reject the malformed history; alternatively complete more than six turns and submit another prompt.

### Acceptance criteria

- A new prompt after a failed response is accepted and excludes the failed turn from history.
- Long conversations submit no more than 12 alternating history entries and no more than 12,000 history characters.

## BR-010 — Expense breakdown selects smallest categories before largest

Priority: P1

Evidence: post-implementation review of `backend_new/app/services/ai_chat/presentation_tool.py`.

### Actual

Expense aggregate sums are negative and are ordered descending before conversion to positive display values, so small-magnitude expenses rank ahead of large expenses and may displace them from a top-ten visual.

### Expected

Breakdown and growth visuals rank by descending displayed magnitude with label tie-breaking.

### Reproduction

1. Seed one category with an expense of 100 and another with an expense of 10.
2. Request category spending or growth.
3. Observe the 10 expense ordered ahead of 100.

### Acceptance criteria

- Expense and growth rows are ordered by descending absolute displayed value.
- Top-ten truncation retains the ten largest magnitudes.

## BR-011 — Chart tooltips derive and format financial values in the client

Priority: P1

Evidence: post-implementation review of `frontend_new/src/components/ai-chat/ChatVisual.tsx` and generated shadcn `chart.tsx`.

### Actual

Default Recharts tooltips receive JavaScript numeric conversions and format those values client-side, omitting the server currency display and risking rounding or precision changes.

### Expected

Chart geometry may use finite numeric values, but all visible monetary text—including tooltip content—uses the server-provided display values.

### Reproduction

1. Open a bar or line response.
2. Hover/focus a chart point.
3. Observe a client-formatted numeric tooltip rather than the server money display.

### Acceptance criteria

- Tooltip monetary labels use the matching server `display` value and preserve currency.
- Charts never render a client-derived financial textual fact.

## BR-012 — Income and balance breakdown requests are unsupported

Priority: P1

Evidence: post-implementation review of `backend_new/app/services/ai_chat/presentation_tool.py` and the approved implementation plan.

### Actual

The presentation enum supports only category/tag spending; the breakdown helper forcibly applies the expense flow. Income and balance breakdown requests cannot be answered as approved.

### Expected

Category/tag breakdown and comparison visuals support spending, income, and balance where the underlying transaction data supports them.

### Reproduction

1. Ask for income or balance by category/tag.
2. The agent has no matching analysis and the helper cannot retain a non-expense flow.

### Acceptance criteria

- Income and balance category/tag bar/table visuals use deterministic, scoped backend aggregates.
- Expense ordering remains magnitude-correct.

## BR-013 — Contract and review regression coverage is incomplete

Priority: P2

Evidence: post-implementation review of AI Chat contract models and tests.

### Actual

Some contract cardinality/enum constraints are not mirrored by the frontend, trend selection is not period-complete for long histories, and several planned agent/visual integration cases lack direct coverage.

### Expected

The API/client contract rejects malformed payloads consistently and every planned security/visual behavior has focused automated evidence.

### Acceptance criteria

- Remaining contract constraints and planned critical regression cases are covered before delivery.
- Trend periods are selected chronologically from the requested range, not by aggregate magnitude.
