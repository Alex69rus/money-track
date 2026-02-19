# Development Task List

## 📊 Progress Report

**Legend:** ⏳ Pending | 🔄 In Progress | ✅ Complete | ❌ Blocked


## Backend Migration Checkpoints

| Step | Scope | Status | Date | Notes |
|------|-------|--------|------|-------|
| C# Parity Tests - Step 1 | Integration parity suite in `backend_new/tests/integration` for C# baseline | ✅ Complete | 2026-02-18 | Added deterministic DB fixtures, CRUD/filter/auth/integrity scenarios, and JSON capture support |
| Python Scaffold Hardening - Step 2 | Wire production-ready app skeleton in `backend_new` (config, DB lifecycle, error handling, logging) | 🔄 In Progress | 2026-02-18 | Added lifecycle/exception/logging baseline and unblocked lint/type gates (`ruff`, `mypy`) |
| Auth + Read Parity - Step 3 | Implement Telegram auth semantics + categories/tags parity | ⏳ Pending | - | Includes development bypass and unauthorized response parity |
| Transactions Read Parity - Step 4 | Implement `GET /api/transactions` with full filter/pagination semantics | ⏳ Pending | - | Includes inclusive `toDate` handling and `hasMore` behavior |
| Transactions Write Parity - Step 5 | Implement `POST`, `PUT`, `DELETE` transaction parity and ownership rules | ⏳ Pending | - | Includes default field behavior and status code parity |
| Data Integrity + Migration SQL - Step 6 | Enforce DB constraints/index/FK behavior and Piccolo raw-SQL migrations | ⏳ Pending | - | Forward-only migration flow |
| Final Parity Gate + Cutover Checklist - Step 7 | Full checks, parity run, docs/runbook updates for URL-only cutover | ⏳ Pending | - | No edits in `backend/**` or `frontend/**` |

---

## 🧭 Backend Migration Iteration Plan (Future Agents)

### Iteration M1: Scaffold + Runtime Baseline
**Goal:** Make `backend_new` a reliable runtime foundation before endpoint logic.

- [ ] Validate folder/module structure matches scaffold spec
- [ ] Implement centralized `pydantic_settings` config with `.env` support
- [ ] Add DB connection lifecycle management for Piccolo/PostgreSQL
- [ ] Add global exception handling and info/error logging baseline
- [ ] Ensure `/health` remains parity-compliant (`200`, body `OK`)

**Exit Criteria:** `uv run ruff format .`, `uv run ruff check .`, `uv run mypy .`, `uv run pytest -q` pass in `backend_new`.

### Iteration M2: Auth Contract Parity
**Goal:** Lock auth behavior before business endpoint implementation.

- [ ] Implement Telegram initData validator service
- [ ] Implement development bypass semantics with fixed test user ID
- [ ] Return baseline-equivalent unauthorized shape for missing/invalid auth
- [ ] Apply auth dependency consistently to protected endpoint groups

**Exit Criteria:** Auth-related integration scenarios pass against `backend_new`; no contract drift in status/error body.

### Iteration M3: Categories + Tags Read Parity
**Goal:** Deliver first read-path parity endpoints.

- [ ] Implement `GET /api/categories` with sort order parity (`order_index`, then `name`)
- [ ] Implement `GET /api/tags` with distinct sorted tags for current user only
- [ ] Align schema/serialization naming with existing frontend contract

**Exit Criteria:** Categories/tags parity tests green against `backend_new`.

### Iteration M4: Transactions List Parity (Core Semantics)
**Goal:** Match baseline behavior for `GET /api/transactions`.

- [ ] Implement defaults `skip=0`, `take=50`, and `hasMore` calculation
- [ ] Implement date range semantics including inclusive end-of-day `toDate`
- [ ] Implement amount/category/tag/text filters with baseline behavior
- [ ] Ensure response envelope parity (`data`, `totalCount`, `skip`, `take`, `hasMore`)

**Exit Criteria:** All transactions-read parity tests green, including filter and pagination scenarios.

### Iteration M5: Create Transaction Parity
**Goal:** Implement `POST /api/transactions` behavior and persistence semantics.

- [ ] Add request validation with Pydantic schemas matching C# contract
- [ ] Implement create flow with UTC/date handling parity
- [ ] Persist `tags` using PostgreSQL `text[]` semantics
- [ ] Confirm response status/payload and DB side effects match baseline

**Exit Criteria:** POST/create parity and DB assertion tests pass.

### Iteration M6: Update/Delete Parity + Ownership
**Goal:** Complete write API parity for existing records.

- [ ] Implement `PUT /api/transactions/{id}` with ownership enforcement
- [ ] Implement `DELETE /api/transactions/{id}` with ownership enforcement
- [ ] Match not-found/forbidden behavior from baseline semantics

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

