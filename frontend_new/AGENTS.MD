# `frontend_new` Guide

## Scope

- `frontend_new` is the shipped React/TypeScript frontend.
- Work only on an approved feature, defect, or verification slice.
- Production code lives in `src/`; tests live in the mirrored `tests/` tree and import application code through `@/`. Browser QA harnesses live in `tests/qa/`.
- The phone is the primary surface. Use 390×844 at DPR 3 as the default browser QA viewport.

## Sources of Truth

Read these before changing frontend behavior:

1. `docs/prds/frontend/product-requirements.md`
2. `docs/prds/frontend/user-flows.md`
3. `frontend_new/docs/decisions.md`

Then read only the guide relevant to the change:

- Telegram lifecycle, routes, safe areas, keyboard, or auth: `docs/telegram-mini-app-playbook.md`
- API adapters or backend contract: `docs/api-evolution-plan.md`
- UI composition or a shadcn component: `docs/shadcn-tailwind-playbook.md`
- Verification: `docs/qa-acceptance-checklist.md`
- Defect work: its linked raw report; consult `docs/tasklist.md` only for an approved multi-iteration batch.

## Stack and Implementation Rules

- Use strict TypeScript, React function components, hooks, Vite, Tailwind v4, and existing shadcn primitives.
- Keep data access in `src/services/` and hooks; use `AbortController` cleanup for async effects.
- Never perform complex calculations across many records in frontend memory. Request a backend aggregate resource and render its result instead.
- Do not introduce `any`, Redux, Context as a state store, MUI, CRA variables, or hard-coded API URLs.
- Use `VITE_API_BASE_URL`, attach `X-Telegram-Init-Data` through the shared API client, and keep fallback data restricted to development/test read paths.
- Before adding or changing a shadcn component, run `npx shadcn@latest info --json` and `npx shadcn@latest docs <component>`.
- Preserve loading, empty, error, retry, accessible-label, and recovery states for every affected async interaction.

## Product and Telegram Contract

- Keep exactly four primary destinations: Transactions, Analytics, AI Chat, and Settings.
- Nested transaction edit, category/tag selection, and analytics drilldowns are full-page routes. Telegram owns return navigation through one central BackButton adapter; browser mode falls back to history.
- Preserve parent filters, scroll position, and analytics date context when entering and leaving nested routes.
- Do not render duplicate HTML close/back controls in Telegram nested routes. Keep destructive confirmations as dialogs.
- Respect Telegram safe-area and stable-viewport values. Reserve `max(contentSafeAreaInset.top, 5rem)` plus the normal 1rem content gutter on primary and nested full-page surfaces.
- Version-gate Telegram APIs: disable vertical swipes on Bot API 7.7+ and request fullscreen on 8.0+. Keep a usable normal-host fallback; host controls remain Telegram-owned.

## Verification

- Always run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` from `frontend_new` for a completed frontend slice.
- Run the root-owned phase runner for the affected contract: `npm run qa:phase2`, `npm run qa:phase3`, `npm run qa:phase4`, or `npm run qa:phase5`.
- For layout, sheet, input, or viewport changes, also run `scripts/run_frontend_mobile_qa.sh` and inspect its screenshots. Run the real-device command when `TELEGRAM_DEVICE_NGROK_DOMAIN` is configured; otherwise record that concrete exception.
- Give one runner ownership of frontend/backend startup. If sandboxing blocks `uv` cache access or local binding, rerun the same root QA command with escalation; do not change product code to work around the environment.
- Keep Phase QA assertions focused on user-visible behavior or stable accessibility semantics, not retired implementation hooks.

## Completion

- Record bug evidence and its tracker state before changing behavior.
- Update `docs/tasklist.md` only for active approved multi-iteration work; capture only reusable rules in `GUARDRAILS.md` after each completed iteration.
- Keep raw bug evidence; do not recreate historical visual references or completed-slice plans.
