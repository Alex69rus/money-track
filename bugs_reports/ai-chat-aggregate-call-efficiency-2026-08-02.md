# AI Chat aggregate-call efficiency finding — 2026-08-02

Scope: AI Chat balance-growth line-chart analysis through `aggregate_transactions`.

This report records the observed behavior only. No product-code change was requested.

## Evidence

| File | Surface | Highlight |
| --- | --- | --- |
| `backend_new/app/services/ai_chat/chat_agent.py` | Agent instructions | The prompt permits balance trends but does not say that their signed monthly values must use an unfiltered aggregate. |
| `backend_new/app/services/ai_chat/aggregate_tool.py` | Aggregate tool | The tool description does not explain the relationship between omitted `flow`, signed sums, and net balance. |

## BR-020 — Balance trend makes separate income and expense aggregate calls

Priority: P3

Evidence: User-provided AI Chat trace for “Show me my balance growth for the last 24 months in line chart view by months”.

### Actual

The model calls `aggregate_transactions` twice: once with `filters.flow: "expense"` and once with `filters.flow: "income"`, even though one unfiltered monthly `sum(amount)` returns the signed net balance for every month.

### Expected

For a net balance or balance-growth trend, the model makes one unfiltered monthly aggregate call and uses its signed results for the line chart. Income and expense should be split only when the user explicitly requests separate series or figures.

### Reproduction

1. Ask: “Show me my balance growth for the last 24 months in line chart view by months”.
2. Inspect the model trace.
3. Observe separate expense and income aggregate calls instead of one unfiltered signed monthly sum.

### Acceptance criteria

- A balance/net monthly trend uses one `aggregate_transactions` call with `flow` omitted, `group_by_fields: ["transaction_date_month"]`, and `aggregation_function: "sum"` on `amount`.
- Requests explicitly asking for separate income and expense figures may use separate flow-filtered calls.
- A regression check protects the chosen agent instruction/tool-contract wording.
