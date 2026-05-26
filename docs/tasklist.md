# Development Task List

## Progress Report

Legend: Pending | In Progress | Complete | Blocked

## Completed Delivery Checkpoints

| Step | Scope | Status | Date | Notes |
|------|-------|--------|------|-------|
| Backend Foundation | Production-ready Python backend skeleton (`backend_new`) | Complete | 2026-02-18 | Config, lifecycle, error handling, logging baseline |
| Auth + Read Endpoints | Telegram auth semantics + categories/tags read behavior | Complete | 2026-02-19 | Integration coverage added and validated |
| Transactions Read/Write | List/create/update/delete transaction behaviors and ownership checks | Complete | 2026-02-20 | Core CRUD coverage complete |
| Data Integrity | Constraint and migration hardening | Complete | 2026-02-21 | Unique/FK integrity and migration reproducibility verified |
| Release Readiness | Final quality gates and cutover verification | Complete | 2026-02-22 | Lint/type/test gates and deployment-readiness checks passed |
| Query Efficiency | SQL-based count optimization for transaction listings | Complete | 2026-02-22 | `totalCount` moved to DB aggregate query |
| Auth Gate Activation | Local dual-mode integration run for production auth checks | Complete | 2026-02-22 | Dev+prod auth scenarios validated in one flow |
| Telegram Flow Migration | `SavingTransactions` flow moved from n8n to FastAPI + PTB webhook ingestion | Complete | 2026-03-20 | Added `/api/telegram/webhook`, PTB runtime, OpenAI parsing, and Telegram ingestion tests |
| Telegram Reply Formatting | Telegram save confirmation now renders amounts with two decimal places | Complete | 2026-03-23 | Normalized reply text to fixed `.2f` amount formatting for saved transactions |
| Auto Category Suggestion PRD | Product requirements and rollout definition for two-step LLM category assignment in Telegram ingestion | Complete | 2026-04-03 | Added PRD covering retrieval, LLM ranking, auto-apply, and Telegram remove-category action |
| Auto Category Suggestion Implementation | Two-step Telegram category suggestion, inline callback actions, signed callback payloads, and real-LLM Telegram e2e coverage | Complete | 2026-04-03 | Added business services, callback handling, observability logs, and gated integration e2e validating auto-assign/override/remove |
| Frontend Redesign Requirements Pack | Current UX baseline, user flows, and functional requirements for FE redesign handoff | Complete | 2026-04-04 | Added `docs/frontend-redesign-requirements/` with as-is UX, flow mapping, and MUST-level behavior contract |
| Frontend Requirements Alignment (Draft Refresh) | Align FE requirement docs with refreshed redesign screenshots and approved UX decisions | Complete | 2026-04-04 | Updated nav to include Settings stub, explicit category/tag confirmation flows, category-icon trigger, and analytics category drilldown popup requirements |
| Frontend New Agent Scaffolding | `frontend_new` agent guide and execution docs for Tailwind v4 + shadcn + Telegram Mini App redesign | Complete | 2026-04-04 | Added `frontend_new/AGENTS.MD`, roadmap, API evolution plan, Telegram/shadcn playbooks, QA checklist, and root guide routing update |
| Frontend New Phase-0 Bootstrap | Runnable `frontend_new` scaffold with Vite/TS/Tailwind v4, Telegram bootstrap, nav shell, chat backend stub, and CI quality workflow | Complete | 2026-04-04 | Added app skeleton, env template (`VITE_API_BASE_URL` only), locked redesign decisions, and frontend-new CI pipeline |
| Frontend Redesign Decision Freeze | Lock FR-038/FR-039 and AI chat stub scope for autonomous agent execution | Complete | 2026-04-04 | Updated functional requirements to single-category filtering + multi-currency edit, and documented backend-based `/api/chat` stub scope |
| Frontend New Phase-1 Transactions Slice | Transactions list and filter UX with debounced auto-apply, resilient loading/error states, and incremental loading | Complete | 2026-04-04 | Implemented typed transactions/categories/tags API adapters, responsive mobile+desktop list surfaces, infinite scroll, retry paths, and full frontend quality gates |
| Frontend New Phase-2 Transaction Edit Surfaces | Dedicated category/tag selector flows, full transaction edit dialog with validation, delete confirmation, and in-place list mutation updates | Complete | 2026-04-04 | Implemented FR-010..FR-016 and FR-035 with category icon trigger, explicit selector confirmations, save/delete mutations, and full frontend quality gates |
| Frontend New Phase-3 Analytics Slice | Analytics widgets, date-range recompute behavior, resilient loading/error/no-data states, and category drilldown popup with explicit close | Complete | 2026-04-05 | Implemented FR-018..FR-022 with typed analytics adapters/hooks, drilldown dialog context preservation, and automated `qa:phase3` FR verification |
| Frontend New Phase-4 AI Chat Slice | AI chat timeline, keyboard/send behavior, pending state, reset confirmation, and failure fallback handling | Complete | 2026-04-05 | Implemented FR-023..FR-027 with `/api/chat` adapter wiring, explicit reset confirmation, `qa:phase4` module coverage, and RTL behavior tests (local Playwright run blocked by browser runtime constraints) |
| Frontend New Phase-5 Integration Hardening | API adapter hardening, dev/test fallback mode, Telegram viewport reachability safeguards, and scope guard QA | Complete | 2026-04-05 | Implemented FR-028, FR-030, FR-031, FR-033, FR-040 with controlled fallback banner/data adapters, Phase-5 QA module, and navigation scope + header coverage |
| Frontend Phase-5 QA Runtime Bootstrap Fix | Stabilize shared phase runner backend startup across local environments where `uvicorn` executable lookup fails | Complete | 2026-05-07 | Updated QA bootstrap script to use `uv run python -m uvicorn app.main:app`; reran `qa:phase5` with full FR PASS matrix |
| Frontend Phase QA Automation | Reusable phase QA runner, runtime bootstrap script, and deterministic FR matrix output for future redesign phases | Complete | 2026-04-04 | Added generic `qa:phase` pipeline, phase module structure, stable test IDs for phase-critical controls, and documented usage in frontend docs |
| Frontend Phase-3 QA Scaffold | Analytics phase QA skeleton with TODO FR assertions and reusable script wiring for future phase onboarding | Complete | 2026-04-04 | Added `phase3.mjs`, shared scaffold utils, and `qa:phase3` scripts so next phases only fill assertion bodies |
| Frontend Visual Alignment Planning | Post-functional visual-fidelity track for matching approved `redesign_ui_drafts` | Complete | 2026-05-26 | Added VF-0..VF-6 roadmap phases covering audit, transactions shell, edit popup, category selector, tag selector, analytics, and drilldown visual alignment |
| Frontend Redesign Handoff Docs | Compact current-state handoff for the next agent | Complete | 2026-05-26 | Updated `frontend_new/README.md` and roadmap with implemented status, QA commands, visual-fidelity gap, next slice (`VF-0`), and deferred contracts |
| Frontend Agent Guide Current-State Cleanup | Remove bootstrap-era and desktop-first guidance from `frontend_new/AGENTS.MD` | Complete | 2026-05-26 | Updated scope to continue existing implementation, made VF-0 the active work, documented phone-first Telegram Web App usage, set 390x844/DPR 3 as primary viewport, and removed stale suggested project layout |
| Frontend VF-0 Visual Audit | Draft-vs-current visual gap inventory with phone-baseline screenshots and reusable token extraction | Complete | 2026-05-26 | Added `frontend_new/docs/vf-0-visual-audit.md` and 390x844/DPR3 captures under `frontend_new/docs/visual-audit/vf-0-current/`; defined VF-1 exact first implementation slice and approval-needed deviations |
| Frontend VF-1 Transactions Visual Alignment | Align app shell and transactions home visuals to `home_screen_with_transactions_nav` while preserving existing behavior and QA coverage | Complete | 2026-05-26 | Refactored app header/nav and transactions visual hierarchy in `frontend_new/src/**`, wired category icons from backend data on mobile rows, passed `lint/typecheck/test/build`, and passed `qa:phase2`; captured post-change phone screenshot in `frontend_new/docs/visual-audit/vf-1-after/transactions-home-vf1.png` |

## Upcoming Delivery Checkpoints

| Step | Scope | Status | Notes |
|------|-------|--------|-------|
| Frontend VF-0 Visual Audit | Compare current `frontend_new` screens against every approved redesign draft and extract shared visual tokens/layout rules | Complete | Completed in `frontend_new/docs/vf-0-visual-audit.md` with artifact screenshots and VF-1 start scope |
| Frontend VF-1 Transactions Visual Alignment | Align app shell and transactions surface to `home_screen_with_transactions_nav` while preserving Phase 1/2 behavior | Complete | Implemented and validated with `qa:phase2`; continue with VF-2 next |
| Frontend VF-2..VF-6 Draft Alignment | Align transaction edit, category selector, tag selector, analytics dashboard, and analytics drilldown drafts | Pending | Execute one draft surface at a time with matching phase QA after each slice |

## Working Rules

- Keep slices small and verifiable.
- Prefer behavior-preserving changes unless explicitly requested.
- Keep `docs/` aligned with the current runtime architecture.
