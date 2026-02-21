# Development Task List

## 📊 Progress Report

**Legend:** ⏳ Pending | 🔄 In Progress | ✅ Complete | ❌ Blocked


## Backend Migration Checkpoints

| Step | Scope | Status | Date | Notes |
|------|-------|--------|------|-------|
| C# Parity Tests - Step 1 | Integration parity suite in `backend_new/tests/integration` for C# baseline | ✅ Complete | 2026-02-18 | Added deterministic DB fixtures, CRUD/filter/auth/integrity scenarios, and JSON capture support |
| Python Scaffold Hardening - Step 2 | Wire production-ready app skeleton in `backend_new` (config, DB lifecycle, error handling, logging) | ✅ Complete | 2026-02-18 | Added lifecycle/exception/logging baseline and unblocked lint/type gates (`ruff`, `mypy`) |
| Auth + Read Parity - Step 3 | Implement Telegram auth semantics + categories/tags parity | ✅ Complete | 2026-02-19 | Categories/tags parity validated against `backend_new`; full integration suite green (`16 passed, 2 skipped`) |
| Transactions Read Parity - Step 4 | Implement `GET /api/transactions` with full filter/pagination semantics | ✅ Complete | 2026-02-19 | Verified defaults/filters/inclusive `toDate`/`hasMore` parity; `backend_new` integration suite `17 passed, 2 skipped` |
| Transactions Write Parity - Step 5 | Implement `POST`, `PUT`, `DELETE` transaction parity and ownership rules | ✅ Complete | 2026-02-20 | M5+M6 complete: create/update/delete parity with ownership + not-found coverage |
| Data Integrity + Migration SQL - Step 6 | Enforce DB constraints/index/FK behavior and Piccolo raw-SQL migrations | ⏳ Pending | - | Forward-only migration flow |
| Final Parity Gate + Cutover Checklist - Step 7 | Full checks, parity run, docs/runbook updates for URL-only cutover | ⏳ Pending | - | No edits in `backend/**` or `frontend/**` |

---

## 🧭 Backend Migration Iteration Plan (Future Agents)

### Iteration M1: Scaffold + Runtime Baseline
**Goal:** Make `backend_new` a reliable runtime foundation before endpoint logic.

- [x] Validate folder/module structure matches scaffold spec
- [x] Implement centralized `pydantic_settings` config with `.env` support
- [x] Add DB connection lifecycle management for Piccolo/PostgreSQL
- [x] Add global exception handling and info/error logging baseline
- [x] Ensure `/health` remains parity-compliant (`200`, body `OK`)

**Exit Criteria:** `uv run ruff format .`, `uv run ruff check .`, `uv run mypy .`, `uv run pytest -q` pass in `backend_new`.

### Iteration M2: Auth Contract Parity
**Goal:** Lock auth behavior before business endpoint implementation.

- [x] Implement Telegram initData validator service
- [x] Implement development bypass semantics with fixed test user ID
- [x] Return baseline-equivalent unauthorized shape for missing/invalid auth
- [x] Apply auth dependency consistently to protected endpoint groups

**Exit Criteria:** Auth-related integration scenarios pass against `backend_new`; no contract drift in status/error body.

### Iteration M3: Categories + Tags Read Parity
**Goal:** Deliver first read-path parity endpoints.

- [x] Implement `GET /api/categories` with sort order parity (`order_index`, then `name`)
- [x] Implement `GET /api/tags` with distinct sorted tags for current user only
- [x] Align schema/serialization naming with existing frontend contract

**Exit Criteria:** Categories/tags parity tests green against `backend_new`.

### Iteration M4: Transactions List Parity (Core Semantics)
**Goal:** Match baseline behavior for `GET /api/transactions`.

- [x] Implement defaults `skip=0`, `take=50`, and `hasMore` calculation
- [x] Implement date range semantics including inclusive end-of-day `toDate`
- [x] Implement amount/category/tag/text filters with baseline behavior
- [x] Ensure response envelope parity (`data`, `totalCount`, `skip`, `take`, `hasMore`)

**Exit Criteria:** All transactions-read parity tests green, including filter and pagination scenarios.

### Iteration M5: Create Transaction Parity
**Goal:** Implement `POST /api/transactions` behavior and persistence semantics.

- [x] Add request validation with Pydantic schemas matching C# contract
- [x] Implement create flow with UTC/date handling parity
- [x] Persist `tags` using PostgreSQL `text[]` semantics
- [x] Confirm response status/payload and DB side effects match baseline

**Exit Criteria:** POST/create parity and DB assertion tests pass.

### Iteration M6: Update/Delete Parity + Ownership
**Goal:** Complete write API parity for existing records.

- [x] Implement `PUT /api/transactions/{id}` with ownership enforcement
- [x] Implement `DELETE /api/transactions/{id}` with ownership enforcement
- [x] Match not-found/forbidden behavior from baseline semantics

**Exit Criteria:** PUT/DELETE parity tests green, including cross-user boundary scenarios.

### Iteration M7: Integrity Constraints + Piccolo Migrations
**Goal:** Lock data invariants and migration guarantees.

- [ ] Ensure unique index parity on `(user_id, message_id)`
- [ ] Ensure FK behavior parity (`category_id -> SET NULL`)
- [ ] Add/adjust Piccolo raw-SQL migrations (forward-only)
- [ ] Validate schema compatibility with existing PostgreSQL instance

**Exit Criteria:** Integrity scenarios pass and migrations are reproducible from clean checkout.

### Iteration M8: Full Gate + Cutover Readiness
**Goal:** Produce migration-ready state for configuration-only switch.

- [ ] Run full quality gates: `ruff`, `mypy`, `pytest`, integration suite against `backend_new`
- [ ] Confirm no forbidden diffs in `backend/**` and `frontend/**`
- [ ] Update `backend_new/GUARDRAILS.md` with final takeaways/prevention rules
- [ ] Add concise run/cutover checklist to migration docs

**Exit Criteria:** In-scope parity scenarios are green and frontend can switch by API URL only.

### Iteration Execution Rules (Apply to M1-M8)

- [ ] Execute loop: **Plan → Implement → Test → Report → Guardrail Update → Next**
- [ ] Keep slices small; do not start next iteration until current gates are green
- [ ] Modify only allowed paths (`backend_new/**`, `docs/prd/**` when needed)
- [ ] Stop and request decision if baseline behavior is ambiguous or requires schema redesign
