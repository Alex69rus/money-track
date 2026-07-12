# frontend_new

New frontend workspace for the Money Track redesign.

This folder contains the redesigned frontend implementation and execution docs for Tailwind v4 + shadcn/ui + Telegram Mini App patterns.

## Current Handoff State

- Functional redesign phases 0-5 are implemented in `src/**`.
- Visual Alignment phases `VF-0` through `VF-6` are complete. The remaining Telegram-native completion gate is the real iPhone smoke test; consult `docs/tasklist.md` before selecting an approved next slice.
- This is a Telegram Web App and is expected to be used almost entirely on phones. Treat the phone screen as the primary product surface.
- Use 390x844 / DPR 3 device emulation as the primary browser viewport unless a task names another phone device.
- Do not restart from bootstrap. The app already exists; preserve existing behavior while aligning the UI to the drafts.
- Deferred product/API contracts are tracked in `frontend_new/docs/api-evolution-plan.md`: `/api/chat` needs a stable backend schema, and analytics still uses client-side aggregation.

## Start Here

1. Read `docs/frontend-redesign-requirements/README.md` and linked requirement docs.
2. Use `frontend_new/docs/implementation-roadmap.md` and `docs/tasklist.md` to select the next approved vertical slice.
3. Open matching assets in `docs/frontend-redesign-requirements/redesign_ui_drafts/**` (`screen.png` + `code.html`) and keep implementation visually close.

## Bootstrap Checklist

Historical checklist only. This has already been completed; do not rerun bootstrap unless intentionally rebuilding the app from scratch.

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
  - `npm run qa:phase3`
  - `npm run qa:phase4`
  - `npm run qa:phase5`

What it does:

1. Reuses running FE/BE if reachable.
2. Starts missing services (backend via `uv run python -m uvicorn app.main:app`, frontend via Vite on `127.0.0.1:4173`).
3. Runs the phase module with Playwright and prints a machine-readable FR PASS/FAIL matrix.
4. Uses the primary Telegram phone profile (`390x844`, DPR 3) and a Telegram WebApp fixture.
5. Exits non-zero if any FR fails.

Important runtime note:

- The root QA launcher supplies `VITE_API_BASE_URL` automatically. When starting Vite manually, set it explicitly before running a phase command.

## Mobile Visual and Telegram QA

Use the canonical mobile gate after every `frontend_new` layout, sheet, input, or viewport change:

```bash
scripts/run_frontend_mobile_qa.sh
```

It owns an isolated local `frontend_new`/backend pair by default (`:4174` / `:8002`), then checks iPhone 12 Pro, iPhone 15, iPhone 15 Pro Max, and iPhone SE viewports. It simulates Telegram lifecycle/safe-area/viewport events, checks for horizontal overflow and critical-control collisions, and stores screenshots under `.codex-tmp/mobile-qa/`.

For a real Telegram phone check, configure a reserved ngrok domain on the test bot once, then run:

```bash
cd frontend_new
TELEGRAM_DEVICE_NGROK_DOMAIN=your-reserved-domain.ngrok-free.app npm run qa:telegram-device
```

This command serves `frontend_new` and `/api` through one public origin. It intentionally uses the existing Development backend mode; do not use it as an authentication test. Open the Mini App from the test bot on the physical device and complete the keyboard, bottom-nav, dialog/sheet, and scroll smoke test before stopping the command.

### QA/MCP Troubleshooting

If browser QA fails, use this order:

1. Start services manually with known-good commands:
   - backend: `cd backend_new && uv run python -m uvicorn app.main:app`
   - frontend: `cd frontend_new && npm run dev`
2. Validate runtime readiness first:
   - `curl -sf http://localhost:5173 >/dev/null`
   - `curl -sf http://localhost:8000/health >/dev/null`
   - if `localhost` is unreachable, retry with `127.0.0.1` and keep one host style consistently in QA URLs.
3. Run QA with explicit URLs:
   - `cd frontend_new && QA_FRONTEND_URL=http://localhost:5173 QA_BACKEND_URL=http://localhost:8000 npm run qa:phase -- <phase-id>`
4. If frontend startup fails with `listen EPERM`:
   - switch to another port and pass `QA_FRONTEND_URL`.
   - if sandbox blocks binding, rerun startup with escalation.
5. If backend startup fails before `/health` (for example uv cache permission errors):
   - rerun backend startup with explicit env and escalation.
6. If Playwright reports missing browser:
   - `cd frontend_new && npx playwright install chromium`
7. If Chrome channel launch fails (`SIGABRT`, `kill EPERM`, target closed):
   - use bundled Chromium fallback in the runner.
   - if still unstable, mark browser QA blocked and run deterministic component-level tests with captured error logs.

Phase scaffolding pattern:

- `frontend_new/scripts/qa/phases/phase3.mjs` and `phase4.mjs` are concrete FR assertion modules.
- Use `scaffold-utils.mjs` when creating future phase modules, then replace TODO entries with concrete Playwright assertions in `run()`.

## Document Map

- `frontend_new/AGENTS.MD`: main operating guide for AI agents.
- `frontend_new/GUARDRAILS.md`: accumulated iteration takeaways to prevent repeated FE mistakes.
- `frontend_new/docs/implementation-roadmap.md`: phased implementation plan with FR mapping.
- `frontend_new/docs/telegram-mini-app-playbook.md`: Telegram lifecycle, auth, and viewport safety.
- `frontend_new/docs/shadcn-tailwind-playbook.md`: shadcn and Tailwind v4 operating rules.
- `frontend_new/docs/api-evolution-plan.md`: API adapter-first integration and planned BE deltas.
- `frontend_new/docs/qa-acceptance-checklist.md`: functional and UX validation checklist.
- `frontend_new/docs/decisions.md`: locked redesign kickoff decisions.
- `frontend_new/docs/bug-fix-iterations.md`: central frontend bug register, linked evidence/iteration status, and implementation-ready acceptance criteria for the next approved bug-fix slices.

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
