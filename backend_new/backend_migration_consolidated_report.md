# Backend Migration Consolidated Parity Report

## Scope and sources

This report consolidates and deduplicates findings from:
- `backend_migration_review_report.tmp.md`
- `TEMP_backend_migration_parity_report.md`
- `backend_new/backend_migration_review_report.md`
- `backend_new/tmp_csharp_api_contracts.md`

Comparison target: C# backend (`backend/`) vs Python backend (`backend_new/`).

---

## C# baseline contract (source of truth)

## Cross-cutting behavior
- Auth for `/api/tags/*` and `/api/transactions/*` resolves user via Telegram init data; Development mode bypass uses fixed user `123456789`.
- Global error envelope:
  - Unauthorized -> `401` `{ "error": "Unauthorized", "message": "..." }`
  - Unhandled exception -> `500` `{ "error": "Internal Server Error", "message": "An unexpected error occurred" }`
- Serialization defaults:
  - null fields omitted,
  - enums serialized as strings,
  - reference cycles ignored.

## Endpoint contracts and logic

### `GET /health`
- `200` plain text `OK`.

### `GET /api/categories/`
- Returns full category list sorted by `(orderIndex nulls last), then name`.
- Category shape includes:
  - `id`, `name`, `type`, `color?`, `icon?`, `parentCategoryId?`, `orderIndex?`, `createdAt`.

### `GET /api/tags/`
- Auth required.
- Returns sorted distinct tags for current user.
- Logic: fetch user transactions with non-empty tags, flatten arrays, distinct, sort.

### `GET /api/transactions/`
- Auth required.
- Query params: `fromDate`, `toDate`, `minAmount`, `maxAmount`, `categoryId`, `tags`, `text`, `skip`, `take`.
- Filtering and paging logic:
  - scoped by `userId`, includes category relation,
  - `fromDate`: UTC day start inclusive,
  - `toDate`: UTC day end inclusive (`+1 day - 1 tick`),
  - amount/category filters,
  - `tags` param: CSV list; transaction matches if any exact tag matches,
  - `text` param: case-insensitive contains across:
    - `amount.ToString()`,
    - `note`,
    - each tag (substring),
    - category name,
  - ordered by `transactionDate DESC`,
  - defaults `skip=0`, `take=50`,
  - response object: `data`, `totalCount`, `skip`, `take`, `hasMore`.

### `POST /api/transactions/`
- Auth required.
- Body (`CreateTransactionDto`):
  - required: `transactionDate`, `amount`, `currency`,
  - optional: `note`, `categoryId`, `tags`, `smsText`, `messageId`,
  - declared constraints include `amount >= 0.01` and max lengths (`note`, `currency`, `smsText`, `messageId`),
  - `currency` default `AED`.
- Logic:
  - normalize transaction date to UTC,
  - default `tags` to `[]` when null,
  - set `createdAt`.
- Response: `201 Created`, `Location: /api/transactions/{id}`, body contains created transaction.

### `PUT /api/transactions/{id}`
- Auth required.
- Body (`UpdateTransactionDto`): similar to create, without `smsText`/`messageId` updates.
- Ownership enforced.
- Response:
  - `404` when not found or not owned (empty body behavior in C#),
  - `200` updated transaction (with category when available).

### `DELETE /api/transactions/{id}`
- Auth required.
- Ownership enforced.
- Response:
  - `404` when not found or not owned,
  - `204` on success.

## DB expectations used by API
- `transaction` and `category` tables with snake_case DB naming.
- Unique index on `(user_id, message_id)`.
- FK: `transaction.category_id -> category.id` with `ON DELETE SET NULL`.
- Category self-FK on `parent_category_id` with `ON DELETE RESTRICT`.

---

## Python parity status

## Confirmed parity
- Endpoint coverage exists for `/health`, `/api/categories/`, `/api/tags/`, `/api/transactions` CRUD/filter routes.
- Categories ordering logic matches (`orderIndex` nulls last, then name).
- Tags endpoint behavior matches (current-user, distinct, sorted).
- Transactions date range semantics match UTC day boundaries.
- Pagination defaults and `hasMore` logic match (`skip=0`, `take=50`).
- Update/delete ownership checks match via `(id, user_id)` filtering.
- 401 and 500 envelope shape for auth/unhandled errors is aligned.
- Schema intent is aligned in migration: core tables, FK actions, indexes, and unique `(user_id, message_id)`.
- CamelCase API field naming is preserved.
- Category type parity is acceptable if DB values remain the same domain values (`Income`/`Expense`).

## High-risk mismatches (cutover blockers)
1. Null-field serialization mismatch:
   - C# omits nulls globally.
   - Python includes null-valued keys by default.
   - FE may observe contract drift (missing key vs explicit `null`).

2. Transactions `text` search semantics mismatch:
   - C# uses case-insensitive substring search across amount-as-string, note, tags, and category name.
   - Python currently differs for tags and amount (`tags.any(text)` exact member behavior; amount parsed and compared as equality).
   - Result sets can differ materially.

3. Startup operational mismatch (migrations/seeding):
   - C# runs migrations and category seed on startup.
   - Python startup currently opens/closes DB pool only.
   - Fresh/partially prepared environments can fail or return incomplete data.

4. Update 404 payload mismatch:
   - C# returns empty 404 body.
   - Python default `HTTPException(404)` returns JSON detail payload.
   - Contract-visible response change.

## Medium-risk mismatches
1. Numeric representation risk:
   - C# emits decimal semantics.
   - Python maps amount to `float` in response model.
   - Precision/format drift possible for edge values.

2. Amount validation parity risk:
   - C# contract intent includes minimum `amount >= 0.01`.
   - Python schemas currently do not enforce minimum amount.
   - Zero/negative values may be accepted unless constrained elsewhere.

3. Validation status code risk:
   - Python/FastAPI default validation failures are typically `422`.
   - C# validation failures may surface differently (often `400`, depending on pipeline).
   - Clients depending on exact status/payload may break.

4. Environment variable contract drift for dev auth bypass:
   - C# uses `ASPNETCORE_ENVIRONMENT=Development`.
   - Python uses `ENVIRONMENT=Development`.
   - Misconfiguration can cause unexpected auth enforcement.

5. Trailing-slash routing behavior risk:
   - FastAPI may redirect for slash mismatch (e.g., 307).
   - C# route behavior can differ.
   - Some clients may experience extra redirect/retry behavior.

6. Query efficiency difference in transaction total counting:
   - C# computes SQL count.
   - Python implementation may materialize rows for count (`len(await query.run())`).
   - Primarily performance risk, not core contract break.

---

## Final readiness assessment

Current state is not fully safe for transparent backend replacement.

Primary blockers to resolve before cutover:
1. Align null serialization behavior.
2. Align full `text` search semantics.
3. Align startup migration and category-seeding guarantees.
4. Align update endpoint 404 response body contract.

Important follow-up hardening:
1. Use decimal-safe amount response handling.
2. Enforce amount minimum validation consistently.
3. Lock expected validation status code/error contract.
4. Standardize development environment toggle variable behavior.
5. Validate route slash behavior against real clients.
6. Improve count-query efficiency if dataset size is significant.

## Recommended verification after fixes
- Run parity integration tests against both backends with response diffs for:
  - null-field omission,
  - text search (amount substring and tag substring/case behavior),
  - create/update validation edge cases,
  - update 404 body,
  - startup readiness assumptions.
