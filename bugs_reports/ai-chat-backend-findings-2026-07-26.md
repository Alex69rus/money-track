# AI Chat backend findings — 2026-07-26

Scope: `feature/ai-chat` backend tool and HTTP implementation reviewed against `main` and the AI Chat PRD.

This report records observed defects only. The approved implementation plan is tracked separately in the delivery handoff.

## Evidence

| File                                                    | Surface                 | Highlight                                                                                                      |
| ------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| `backend_new/app/services/ai_chat/aggregate_tool.py`    | Aggregate tool          | Ungrouped totals render invalid SQL and aggregation results cannot be paged.                                   |
| `backend_new/app/services/ai_chat/transaction_scope.py` | Aggregate date grouping | Query filters use the configured business timezone while group buckets use UTC projection columns.             |
| `backend_new/app/services/ai_chat/common.py`            | Tool input validation   | Pagination is nested and unconstrained; filters accept unknown fields.                                         |
| `backend_new/app/api/routes/ai_chat_router.py`          | Chat HTTP API           | The route uses a GET query and does not match the existing POST client contract or provide retryable failures. |

## BR-003 — Aggregate totals without grouping fail

Priority: P1

Evidence: `backend_new/app/services/ai_chat/aggregate_tool.py`; static review.

### Actual

Calling the aggregate tool with no grouping fields produces invalid SQL instead of a total for the current user's filtered transactions.

### Expected

The aggregate tool returns a correctly scoped grand total when no grouping is requested.

### Reproduction

1. Invoke `aggregate_transactions` with `group_by_fields: []`.
2. Observe the generated malformed `SELECT` / `GROUP BY` statement.

### Acceptance criteria

- An ungrouped aggregate returns one result with empty grouping fields.
- The result remains scoped to the authenticated user and supplied filters.

## BR-004 — Aggregate period buckets disagree with business date filters

Priority: P1

Evidence: `backend_new/piccolo_migrations/db_2026_07_25t14_00_00_000001.py`; `backend_new/app/services/ai_chat/transaction_scope.py`; static review.

### Actual

Date filters use the configured business timezone, but aggregate day, month, quarter, and year buckets are calculated in UTC.

### Expected

Transactions selected for a business-local day are grouped under that same business-local day and period.

### Reproduction

1. Seed a transaction near an Asia/Dubai local midnight.
2. Filter and group by the local calendar day.
3. Observe the transaction assigned to the previous UTC day.

### Acceptance criteria

- Date filters and period grouping use the same runtime-configured timezone.
- No timezone configuration or derived bucket is persisted for this behavior.

## BR-005 — Tool pagination and filters can produce unsafe requests

Priority: P2

Evidence: `backend_new/app/services/ai_chat/common.py`; `backend_new/app/services/ai_chat/tags_tool.py`; static review.

### Actual

`skip` and `take` are nested in a filter object for transaction listing and are unbounded across tools; negative PostgreSQL limits can return all matching rows. Unknown filter fields are silently accepted.

### Expected

Pagination is a bounded top-level tool contract and malformed filter inputs are rejected before querying.

### Reproduction

1. Invoke a paginated tool with `take: -1` or an extremely large value.
2. Or include an unknown filter key.
3. Observe unbounded retrieval or silent acceptance.

### Acceptance criteria

- All paginated tools enforce non-negative offsets and bounded positive page sizes.
- Unknown and internally inconsistent filter inputs fail validation.

## BR-006 — Chat HTTP contract leaks queries and has no retryable failure path

Priority: P2

Evidence: `backend_new/app/api/routes/ai_chat_router.py`; `backend_new/app/services/ai_chat/chat_agent.py`; static review.

### Actual

The backend exposes `GET /api/chat/response?query=...`, which puts financial questions in a URL, differs from the current POST client contract, and lets provider failures become generic server errors.

### Expected

The backend accepts a POST body, derives user identity solely from authentication, and returns a safe retryable response when the provider is unavailable.

### Reproduction

1. Send a chat question through the current frontend POST request.
2. Observe that it does not reach the backend route.
3. Trigger a provider/configuration failure and observe the generic failure response.

### Acceptance criteria

- `POST /api/chat` accepts the message while ignoring client-supplied identity fields.
- Provider failures are logged and presented as a safe retryable response.

## BR-007 — Agent tools return Python representations instead of JSON

Priority: P2

Evidence: User-supplied `aggregate_transactions` tool output; `backend_new/app/services/ai_chat/aggregate_tool.py`; local Agents SDK source review.

### Actual

Tool functions return ordinary Pydantic models or lists. The Agents SDK stringifies these values before passing them to the model, producing Python representations such as `TransactionAggregationResult(... value=Decimal('-1.23'))`.

### Expected

Every model-facing tool result is valid JSON text with stable field names and JSON-compatible values.

### Reproduction

1. Invoke `aggregate_transactions` with an ungrouped sum.
2. Inspect the function-call output passed back to the model.
3. Observe a Python/Pydantic representation rather than JSON.

### Acceptance criteria

- Transaction list, aggregate, and tag tools return explicit JSON text outputs to the model.
- Decimal amounts and empty grouping fields remain represented correctly in JSON.
