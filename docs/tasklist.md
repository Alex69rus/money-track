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

## Working Rules

- Keep slices small and verifiable.
- Prefer behavior-preserving changes unless explicitly requested.
- Keep `docs/` aligned with the current runtime architecture.
