# Frontend API Evolution Plan

Status: approved for implementation — 2026-07-17.

## Contract boundaries

`frontend_new` isolates HTTP access under `src/services/api/`. Components call hooks or typed service adapters rather than `fetch` directly.

- The shared client reads `VITE_API_BASE_URL` and sends `X-Telegram-Init-Data`.
- Adapters use typed DTO mappings, `AbortController` cancellation, and UI recovery states.
- Development / test fallback data is allowed only for read paths. Analytics never fabricates a local aggregate after an API failure.
- Existing `GET /api/transactions` remains the paginated transaction-list resource. Its established filters and response shape stay compatible.

## Calculation currency

Analytics is calculated in one backend-owned calculation currency. For the first implementation it is the constant `AED` in backend configuration / analytics code.

- The frontend never sends a currency to analytics endpoints.
- Analytics responses do not echo a period, currency, available-currency list, or other request input.
- Transactions continue to preserve their own currencies in read and edit flows.
- A future user setting will replace the backend constant. The setting must be resolved on the backend before every analytics query, so the frontend contract stays unchanged.

## Analytics resources

One widget maps to one focused read resource. These endpoints use the same optional `fromDate` and `toDate` query parameters as the transaction list. Dates retain inclusive `BUSINESS_TIMEZONE` semantics; an inverted range returns `422`.

| Widget / consumer | Endpoint | Response responsibility |
| --- | --- | --- |
| Balance Snapshot on Transactions and Analytics | `GET /api/transactions/summary` | Income, expense magnitude, balance, and transaction count. No average transaction value. |
| Spendings by Category | `GET /api/transactions/by-categories` | Expense totals, counts, shares, and category presentation metadata. |
| Spendings by Tag | `GET /api/transactions/by-tags` | Expense totals, counts, and shares by canonical tag. |
| Monthly Trends | `GET /api/transactions/by-months` | Monthly income, expense magnitude, and balance. |
| Category / tag drilldown rows | Existing paginated `GET /api/transactions` | The FE sends `fromDate`, `toDate`, the selected category or tag, `flow=expense`, and `calculationCurrencyOnly=true`. The boolean asks the backend to apply its own calculation currency; no currency value comes from the FE. |

The aggregate endpoints return only their widget data—never a page-shaped overview, transaction rows, repeated request parameters, or unrelated widgets. Monetary totals are fixed-scale decimal strings, not JSON floats.

### Response schemas

`GET /api/transactions/summary` returns the shared balance-widget projection:

```json
{
  "totalIncome": "1200.00",
  "totalExpenses": "450.50",
  "balance": "749.50",
  "transactionCount": 42
}
```

`GET /api/transactions/by-categories` returns a non-paginated, descending expense breakdown. `share` is a numeric ratio for visual presentation; every monetary field remains a decimal string.

```json
{
  "data": [
    {
      "categoryId": 7,
      "categoryName": "Groceries",
      "categoryIcon": "shopping_cart",
      "categoryColor": "#2d8cff",
      "amount": "450.50",
      "transactionCount": 12,
      "share": 0.56
    }
  ]
}
```

`GET /api/transactions/by-tags` returns the same shape without category presentation fields and with the canonical `tag` field. `GET /api/transactions/by-months` returns ascending business-local months:

```json
{
  "data": [
    {
      "month": "2026-07",
      "income": "1200.00",
      "expenses": "450.50",
      "balance": "749.50"
    }
  ]
}
```

Each endpoint accepts only `fromDate` and `toDate` for its period. It intentionally does not return those request values, the calculation currency, or a page-wide envelope.

## Aggregate semantics

- Income is `amount > 0`; expense is `amount < 0`; `totalExpenses` is a positive magnitude; `balance = income - expenses`.
- Zero-valued rows contribute to the count but neither income nor expense. Average-transaction calculation and display are removed.
- Category and tag aggregates cover expenses only, matching the current analytics UI.
- Tag shares can total more than 100%, because an expense can have multiple tags.
- All transaction predicates, including any calculation-currency and flow constraints used for a drilldown, are applied before pagination.

## Drilldown query contract

The existing transaction collection receives only additive query filters:

- `flow=expense|income` maps to `amount < 0` or `amount > 0`; zero matches neither.
- `calculationCurrencyOnly=true` applies the backend-selected calculation currency. It never accepts a currency value from the frontend.
- `uncategorized=true` means `category_id IS NULL` and is mutually exclusive with `categoryId`.
- `tag=<canonical-tag>` supports the one tag selected in a tag drilldown. The established comma-separated `tags` filter keeps its existing any-match behavior.

Category and tag drilldowns send the selected resource filter plus `flow=expense` and `calculationCurrencyOnly=true`, so their count and money population exactly matches the aggregate card.

## Data normalization and performance

- Currency and tag normalization belongs on the backend write path. Existing tags must be migrated to the canonical trimmed, lowercase form before a tag aggregate can reliably link to its drilldown.
- Reuse the existing `(user_id, transaction_date)` index for range queries first. Benchmark production-shaped data before adding `(user_id, currency, transaction_date)`; do not add tag indexing speculatively.
- The database performs every aggregate-resource predicate, grouping, sum, count, share calculation, and ordering. The application must not fetch matching transaction rows and reduce, group, or sort them in memory.
- Runtime code uses Piccolo. For PostgreSQL operations Piccolo's query builder cannot represent safely—currently array `UNNEST`, window totals, and business-timezone month bucketing—the resource uses `Transaction.raw()` with fixed parameterized SQL. Query structure is static; only values are bound parameters.
- Aggregate resources return their compact widget projections only; no source transaction collection is loaded into backend or frontend memory.

## Frontend migration

- Remove the paged `fetchAnalyticsTransactions` loop, `useAnalyticsTransactions`, `buildAnalyticsModel`, embedded drilldown transactions, currency inference, and average-transaction UI.
- Add one typed API adapter and abortable hook per aggregate resource.
- Use `summary` for both balance snapshots.
- Keep category/tag drilldowns paginated and refresh affected widget data after transaction mutations instead of recomputing on the client.

## Implementation sequence

1. **Backend contract and focused calculations** — Add the four route handlers and response schemas; centralize inclusive business-local date predicates; use the backend `AED` calculation-currency constant; express each resource as a database aggregate query with all predicates, grouping, share calculation, and ordering executed before rows leave PostgreSQL.
2. **Transaction-list drilldown compatibility** — Add the four additive filters above, canonicalize currency/tags on writes and ingestion, and add a forward data migration for existing values. Add integration tests before frontend wiring.
3. **Frontend replacement** — Replace the all-pages analytics fetch loop with one adapter/hook per widget. Remove client aggregation, currency inference, embedded drilldown data, and the average widget. Rewire both balance snapshots to the shared summary hook and drilldowns to the paginated transaction hook.
4. **Verification and handoff** — Run backend format/lint/type/tests, frontend lint/type/tests/build, the affected Phase-2/Phase-3/Phase-5 QA, and mobile QA. Record the final delivery and reusable guardrails.

## Verification

- Backend: user isolation, Dubai day/month boundaries, signed and zero rules, decimal serialization, tag/category totals, drilldown parity, input validation, mutation refresh behavior, and review that aggregate resources never load source transactions for in-memory calculation.
- Frontend: one request per widget, loading/empty/error/retry states, shared summary usage, server-provided values, and paginated drilldowns.
- Run the applicable backend integration suite, frontend lint/typecheck/tests/build, and affected browser phase QA.

## Deferred, separately approved work

- Define a stable response schema for `/api/chat`.
- Add the user-selected calculation-currency setting. It replaces the backend `AED` constant without changing the analytics endpoint request shape.
