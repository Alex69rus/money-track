# Database-side Analytics aggregation findings — 2026-07-18

Scope: Focused Analytics and tag read resources spanning `frontend_new` API consumers and `backend_new` query implementation.

## Evidence

| File | Surface | Highlight |
| --- | --- | --- |
| `backend_new/app/db/queries.py` | Analytics aggregate resources | The first implementation fetched filtered transaction rows and calculated summary, category, tag, and monthly values in application memory. |
| User feedback — 2026-07-18 | Analytics performance architecture | Multi-record calculations must run in the database, not in frontend or backend memory. |

## BR-021 — Analytics aggregation is performed in backend memory

Priority: P1

Evidence: `backend_new/app/db/queries.py`; user feedback — 2026-07-18.

### Actual

The backend loaded every transaction in the selected Analytics range and then grouped, summed, sorted, and calculated shares in Python. This removes client-side work but still has unbounded application-memory and latency cost.

### Expected

PostgreSQL applies filters and calculates all multi-record aggregate values. The backend receives only each endpoint's compact aggregate result and the frontend renders it without further multi-record calculation.

### Reproduction

1. Create a user with many AED transactions in the selected date range.
2. Request any Analytics aggregate resource.
3. Inspect the resource implementation.
4. Observe an unbounded matching transaction set is fetched before its result is calculated.

### Acceptance criteria

- Every Analytics aggregate and `/api/tags` uses a database query for multi-record calculation and ordering.
- No aggregate method reads a matching source transaction collection into Python for reduction or grouping.
- Integration checks retain exact aggregate, date-boundary, currency, and isolation behavior.
