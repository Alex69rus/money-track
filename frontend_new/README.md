# frontend_new

New frontend workspace for the Money Track redesign.

This folder currently contains the agent scaffolding and execution docs needed to implement the redesign with Tailwind v4 + shadcn/ui + Telegram Mini App patterns.

## Start Here

1. Read `frontend_new/AGENTS.MD`.
2. Read `docs/frontend-redesign-requirements/README.md` and linked requirement docs.
3. Use `frontend_new/docs/implementation-roadmap.md` to pick the next vertical slice.
4. Open matching assets in `docs/frontend-redesign-requirements/redesign_ui_drafts/**` (`screen.png` + `code.html`) and keep implementation visually close.
5. Use mandatory skills during implementation:
   - `telegram-mini-app` for Telegram WebApp integration concerns.
   - `shadcn` for UI/component/layout/form implementation.

## Bootstrap Checklist

Use this once when turning scaffolding into runnable app code:

1. Initialize a Vite React TypeScript app in `frontend_new/`.
2. Set up Tailwind v4.
3. Initialize shadcn/ui with Vite template.
4. Add Telegram Mini App bootstrap in `index.html` and `src/services/telegram`.
5. Add scripts: `lint`, `typecheck`, `test`, `build`.
6. Add `.env` support with `VITE_API_BASE_URL` only.

## Phase QA Automation

Reusable phase QA runner (phase modules live under `frontend_new/scripts/qa/phases/`):

- From repo root, run:
  - `npm run qa:phase -- <phase-id>`
- Shortcut for current implemented phase:
  - `npm run qa:phase2`
  - `npm run qa:phase3` (scaffold with TODO assertions)

What it does:

1. Reuses running FE/BE if reachable.
2. Starts missing services (backend via `uv run uvicorn app.main:app`, frontend via Vite on `127.0.0.1:4173`).
3. Runs the phase module with Playwright and prints a machine-readable FR PASS/FAIL matrix.
4. Exits non-zero if any FR fails.

Phase scaffolding pattern:

- `frontend_new/scripts/qa/phases/phase3.mjs` is an intentional TODO scaffold for analytics FRs.
- Copy that pattern for next phases and replace TODO entries with concrete Playwright assertions in `run()`.

## Document Map

- `frontend_new/AGENTS.MD`: main operating guide for AI agents.
- `frontend_new/GUARDRAILS.md`: accumulated iteration takeaways to prevent repeated FE mistakes.
- `frontend_new/docs/implementation-roadmap.md`: phased implementation plan with FR mapping.
- `frontend_new/docs/telegram-mini-app-playbook.md`: Telegram lifecycle, auth, and viewport safety.
- `frontend_new/docs/shadcn-tailwind-playbook.md`: shadcn and Tailwind v4 operating rules.
- `frontend_new/docs/api-evolution-plan.md`: API adapter-first integration and planned BE deltas.
- `frontend_new/docs/qa-acceptance-checklist.md`: functional and UX validation checklist.
- `frontend_new/docs/decisions.md`: locked redesign kickoff decisions.

## Design Assets (Mandatory Input)

Use these as direct visual and structural starting points for redesign slices:

- `docs/frontend-redesign-requirements/redesign_ui_drafts/home_screen_with_transactions_nav/`
- `docs/frontend-redesign-requirements/redesign_ui_drafts/analytics_with_transactions_nav/`
- `docs/frontend-redesign-requirements/redesign_ui_drafts/transaction_detail_pop_up/`
- `docs/frontend-redesign-requirements/redesign_ui_drafts/category_selector_expandable_groups/`
- `docs/frontend-redesign-requirements/redesign_ui_drafts/tag_selector_chip_grid_layout/`
- `docs/frontend-redesign-requirements/redesign_ui_drafts/category_transactions_pop_up_with_close_button/`

For each folder:

- `screen.png` is the visual fidelity target.
- `code.html` is a structural reference to translate into React + shadcn components.
