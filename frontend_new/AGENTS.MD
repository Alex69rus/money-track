# AGENTS.MD - frontend_new

Operating guide for AI agents building the redesigned frontend in `frontend_new`.

## Scope and Mission

- Build a new frontend from scratch in `frontend_new`.
- Treat legacy `frontend/` as behavior reference only.
- Treat backend API as a starting point, not a fixed contract.
- Keep behavior aligned with `docs/frontend-redesign-requirements/functional-requirements.md` unless explicitly changed.
- Keep final UI visually close to approved redesign drafts in `docs/frontend-redesign-requirements/redesign_ui_drafts/**`.
- Treat legacy frontend implementation rules (CRA + MUI-oriented) as non-applicable to `frontend_new`.

## Mandatory Read Order

1. `docs/frontend-redesign-requirements/README.md`
2. `docs/frontend-redesign-requirements/functional-requirements.md`
3. `docs/frontend-redesign-requirements/user-flows.md`
4. `docs/frontend-redesign-requirements/current-ux.md`
5. `frontend_new/docs/implementation-roadmap.md`
6. `frontend_new/docs/telegram-mini-app-playbook.md`
7. `frontend_new/docs/shadcn-tailwind-playbook.md`
8. `frontend_new/docs/api-evolution-plan.md`
9. `frontend_new/docs/qa-acceptance-checklist.md`
10. `frontend_new/docs/decisions.md`
11. For the current slice, read matching draft folder under `docs/frontend-redesign-requirements/redesign_ui_drafts/**`:
   - use both `screen.png` (visual target) and `code.html` (starting structure reference).

## Mandatory Skills

Use these skills explicitly during redesign work:

- `telegram-mini-app` (required when task touches Telegram integration):
  - `window.Telegram.WebApp` usage
  - app bootstrap (`ready`, `expand`)
  - viewport/safe-area/theme handling
  - initData/header/auth-context behavior
  - Telegram client compatibility behavior
- `shadcn` (required for UI implementation in `frontend_new`):
  - page/layout/component/form construction
  - selector and modal/sheet surfaces
  - navigation and shared UI primitives
  - any component additions/updates via shadcn CLI
- `iteration-retrospective-capture` (required after each completed iteration):
  - capture root cause of mistakes, regressions, and dead ends
  - record validated patterns worth repeating
  - append concise guardrails to `frontend_new/GUARDRAILS.md`

Execution requirement:

- Before UI implementation, run `npx shadcn@latest info --json`.
- Before using any shadcn component, run `npx shadcn@latest docs <component>`.
- Telegram-facing changes must follow `frontend_new/docs/telegram-mini-app-playbook.md`.
- After finishing each iteration, run `iteration-retrospective-capture` and persist results to `frontend_new/GUARDRAILS.md`.

## Design Baseline (Mandatory)

For each domain, start from these draft artifacts:

- Transactions home/nav:
  - `docs/frontend-redesign-requirements/redesign_ui_drafts/home_screen_with_transactions_nav/screen.png`
  - `docs/frontend-redesign-requirements/redesign_ui_drafts/home_screen_with_transactions_nav/code.html`
- Analytics/nav:
  - `docs/frontend-redesign-requirements/redesign_ui_drafts/analytics_with_transactions_nav/screen.png`
  - `docs/frontend-redesign-requirements/redesign_ui_drafts/analytics_with_transactions_nav/code.html`
- Transaction detail popup:
  - `docs/frontend-redesign-requirements/redesign_ui_drafts/transaction_detail_pop_up/screen.png`
  - `docs/frontend-redesign-requirements/redesign_ui_drafts/transaction_detail_pop_up/code.html`
- Category selector:
  - `docs/frontend-redesign-requirements/redesign_ui_drafts/category_selector_expandable_groups/screen.png`
  - `docs/frontend-redesign-requirements/redesign_ui_drafts/category_selector_expandable_groups/code.html`
- Tag selector:
  - `docs/frontend-redesign-requirements/redesign_ui_drafts/tag_selector_chip_grid_layout/screen.png`
  - `docs/frontend-redesign-requirements/redesign_ui_drafts/tag_selector_chip_grid_layout/code.html`
- Analytics category drilldown popup:
  - `docs/frontend-redesign-requirements/redesign_ui_drafts/category_transactions_pop_up_with_close_button/screen.png`
  - `docs/frontend-redesign-requirements/redesign_ui_drafts/category_transactions_pop_up_with_close_button/code.html`

Implementation rule:

- Preserve close visual fidelity to these drafts while using shadcn components and Tailwind v4 tokens.
- Prefer adapting draft structure into reusable React/shadcn compositions, not copying raw HTML directly.

## Stack Contract

- React + TypeScript (strict) with Vite.
- Tailwind CSS v4.
- shadcn/ui for reusable UI primitives and compositions.
- Telegram Mini App integration via `window.Telegram.WebApp`.
- Fetch API with `AbortController` for cancellable requests.
- Simple state model: `useState`, `useEffect`, custom hooks (no Redux, no Context as state store).

## Implementation Standards (Required)

- Type safety:
  - Keep TypeScript strict.
  - Do not introduce `any` in runtime application code.
- Component model:
  - Use function components and hooks.
  - Keep components focused; split when a file gets too large or mixes unrelated responsibilities.
- Data access:
  - Keep API calls in service/hook layer, not scattered across presentational components.
  - Use `AbortController` and cleanup in async effects.
- UX resilience:
  - Every async interaction must have visible loading, clear error state, and recovery action (`retry` or equivalent).
  - Keep optimistic/in-place refresh behavior where required by FRs.
- Accessibility:
  - Provide semantic labels for interactive controls.
  - Ensure icon-only actions have explicit ARIA labels.
  - Preserve keyboard behavior expectations (for example chat Enter/Shift+Enter contract).
- Responsive behavior:
  - Validate UI at mobile-first width (~375px) and desktop (~1920px).
  - Preserve Telegram viewport/safe-area behavior under keyboard and orientation changes.

## Legacy Boundary Rules

- Do not copy implementation patterns directly from `frontend/` (legacy architecture).
- Do not import or reintroduce MUI-based UI patterns in `frontend_new`.
- Do not use CRA-style env names (`REACT_APP_*`) in `frontend_new`.
- Keep env contract based on `VITE_API_BASE_URL` (and approved Vite-prefixed variables only).

## Functional Non-Negotiables

- Keep four bottom-nav destinations: Transactions, Analytics, AI Chat, Settings (stub).
- Default landing destination is Transactions.
- Keep persistent app header and bottom nav on mobile and desktop.
- Bottom nav must not obstruct focused inputs when mobile keyboard is open.
- Transactions filters must auto-apply (debounced).
- Category and tag edits must use dedicated selector surfaces with explicit confirmation.
- Full transaction edit must validate required fields and support delete with confirmation.
- Analytics must support category drilldown popup with explicit close action.
- AI Chat must support Enter-send, Shift+Enter multiline, pending state, and reset with confirmation.
- All key async flows must expose loading, error, and recovery actions.

## Locked Product Decisions

- FR-038: transactions filtering uses single category selection in redesign scope.
- FR-039: keep multi-currency support in transaction edit flow.
- AI Chat integration in current phase is a backend-linked stub via `VITE_API_BASE_URL` (`/api/chat` path), with full FE/BE implementation deferred.

## Telegram Mini App Guardrails

- Include Telegram WebApp script in `index.html`:
  - `https://telegram.org/js/telegram-web-app.js?61`
- Initialize early, call `ready()` when critical UI is mounted, call `expand()` for full-height UX.
- Use Telegram CSS and viewport/safe-area data (`--tg-theme-*`, `--tg-viewport-*`, `--tg-safe-area-*`).
- Use `viewportStableHeight` for bottom-pinned controls.
- Register and clean up Telegram event handlers (`themeChanged`, `viewportChanged`, `safeAreaChanged`, `contentSafeAreaChanged`, `fullscreenChanged`).
- Never trust `initDataUnsafe` for auth decisions.
- Send raw `initData` to backend for validation; backend validates hash and `auth_date`.
- Use `isVersionAtLeast` before calling newer Telegram WebApp methods.

## shadcn and Tailwind v4 Guardrails

- Use project package runner for shadcn CLI (npm => `npx shadcn@latest ...`).
- Before using any component, run:
  - `npx shadcn@latest info --json`
  - `npx shadcn@latest docs <component>`
- Prefer existing shadcn components over custom markup.
- Use semantic tokens (`bg-background`, `text-muted-foreground`, etc.), not raw colors.
- Use `gap-*`, never `space-x-*` or `space-y-*`.
- Use `size-*` when width and height are equal.
- Use `cn()` for conditional classes.
- Keep full composition rules intact (for example: `DialogTitle` required in dialogs, `TabsTrigger` inside `TabsList`, `AvatarFallback` required).

## API and Data Rules

- Keep API client and DTO mappings isolated under a dedicated adapter layer.
- Always attach Telegram init data header in API calls:
  - `X-Telegram-Init-Data`
- API base URL must come from env (`VITE_API_BASE_URL`).
- User tag options must come from backend endpoint for both filter and edit flows.
- Backend schema can evolve for redesign needs; document required changes in `frontend_new/docs/api-evolution-plan.md`.

## Suggested Project Layout

```text
frontend_new/
  src/
    app/
      router/
      providers/
      layout/
    pages/
      transactions/
      analytics/
      ai-chat/
      settings/
    features/
      transactions/
      analytics/
      ai-chat/
    components/
      ui/
      shared/
    hooks/
    services/
      api/
      telegram/
    types/
    lib/
  docs/
```

## Failure-Prevention Protocols (Required)

Use these protocols as operational playbooks. They are mandatory when their trigger condition applies.

### Protocol A: shadcn Generation Safety

Trigger: any `npx shadcn@latest add ...` execution.

Execution steps:
1. Run `npx shadcn@latest info --json` before generation.
2. Generate required component(s) with `npx shadcn@latest add ...`.
3. Immediately verify output paths are inside intended `src/**` locations (especially `src/components/ui/**`).
4. If output path is wrong, stop implementation work and fix alias mapping in `components.json` before continuing.
5. If CLI asks to overwrite existing base primitives (for example `button.tsx`), do not overwrite by default; keep existing primitives and add only missing files manually using the documented pattern.

Exit criteria:
1. Generated files are in correct repo paths.
2. No accidental primitive overwrite occurred.

### Protocol B: API Contract Verification Before UI Wiring

Trigger: any slice that introduces or changes API-driven UI behavior.

Execution steps:
1. Confirm endpoint path, request shape, and response shape directly from backend route/schema code.
2. Treat backend routes/schemas and redesign docs as source of truth.
3. Do not use legacy `frontend/` DTOs or env assumptions as contract evidence.
4. If FE needs contract changes, document deltas in `frontend_new/docs/api-evolution-plan.md` before coding around them.

Exit criteria:
1. Adapter types map to confirmed backend payloads.
2. All intentional FE/BE deltas are recorded in the API evolution plan.

### Protocol C: QA Runtime Ownership and Stability

Trigger: end-of-phase browser QA and FR verification.

Execution steps:
1. Assign one runtime owner for FE/BE lifecycle orchestration.
2. Start FE on fixed host/port (`127.0.0.1` + explicit port) and report exact URL.
3. Use isolated browser context/profile for MCP browser sessions.
4. Run deterministic readiness gate from the same network context used by QA (`frontend URL` and backend `/health`) before FR checks.
5. If QA sub-agent fails to return full FR matrix in one wait window, interrupt once for interim status, then respawn once.
6. For failure-path FRs, use deterministic environment-based probes (for example unreachable `VITE_API_BASE_URL`) instead of flaky interception/reload loops.
7. If MCP session is still locked/unstable after one restart attempt, switch to canonical headless QA runner flow.

Exit criteria:
1. QA environment is reproducible and stable.
2. Runtime orchestration is not split across competing agents.

### Protocol D: Phase Exit Evidence Standard

Trigger: phase completion decision.

Execution steps:
1. Produce one final FR matrix for the phase.
2. Mark every phase FR as explicit `PASS` or `FAIL`.
3. Include concise runtime evidence for each failed FR and key diagnostics (console/network where relevant).
4. Treat `PARTIAL` as non-exit status.

Exit criteria:
1. Single final report contains `PASS`/`FAIL` for every mapped FR.
2. Phase is blocked until this report exists.

### Protocol E: Canonical QA Execution Path

Trigger: adding or running phase QA automation.

Execution steps:
1. Use shared entrypoint `npm run qa:phase -- <phase-id>`.
2. Implement new phase checks as isolated modules under `frontend_new/scripts/qa/phases/`.
3. Do not add one-off inline shell QA snippets for phase-exit checks.

Exit criteria:
1. Phase QA runs through shared runner.
2. New checks are reusable and module-based.

### Protocol F: Browser QA and Chrome MCP Triage

Trigger: any browser-driven QA run (Chrome DevTools MCP or Playwright runner) fails or stalls.

Execution steps:
1. Preflight runtime ownership:
   - keep one owner process for FE/BE startup and teardown.
   - avoid parallel agents starting/stopping the same FE/BE ports.
2. Use manual baseline startup before browser QA when services are not already up:
   - backend: `cd backend_new && uv run uvicorn app.main:app`
   - frontend: `cd frontend_new && npm run dev`
3. Deterministic readiness gate from the same context used by QA:
   - `curl -sf http://localhost:5173 >/dev/null`
   - `curl -sf http://localhost:8000/health >/dev/null`
   - if `localhost` fails but `127.0.0.1` works (or vice versa), use the reachable host consistently in QA URLs.
4. Run phase QA with explicit URLs matching reachable hosts:
   - `cd frontend_new && QA_FRONTEND_URL=http://localhost:5173 QA_BACKEND_URL=http://localhost:8000 npm run qa:phase -- <phase-id>`
5. If FE fails with `listen EPERM`:
   - switch to an allowed/working port and update `QA_FRONTEND_URL`.
   - if sandbox blocks local bind, re-run startup with escalation.
6. If backend fails before `/health` (for example uv cache permission errors):
   - run backend with explicit env contract and escalation when sandbox blocks cache/process access.
   - do not continue browser checks until `/health` succeeds.
7. If Playwright/Chrome launch fails (`SIGABRT`, `Target page/context/browser closed`, `kill EPERM`):
   - run `npx playwright install chromium` once.
   - prefer bundled Chromium fallback when Chrome channel is unstable.
   - if headless browser still hangs, mark browser QA blocked and switch to deterministic component-level tests while recording blocker evidence.
8. For Chrome DevTools MCP instability (session lock/transport closure):
   - restart MCP browser context once, then retry.
   - keep a single MCP session owner; avoid concurrent MCP sub-agents.
   - if still unstable after one restart, fall back to canonical headless runner and capture diagnostics.
9. Always record one explicit pass/fail matrix with blocker reason, not `PARTIAL`.

Exit criteria:
1. Browser QA either completes with explicit FR `PASS`/`FAIL` matrix.
2. Or is marked blocked with concrete runtime evidence and deterministic fallback test evidence.

## Working Loop (Required)

1. Pick one small vertical slice from `frontend_new/docs/implementation-roadmap.md`.
2. List FR IDs covered by this slice in your working notes/PR summary.
3. Run Protocol A and Protocol B when applicable before or during implementation.
4. Implement UI + data wiring + loading/error states + recovery path.
5. Validate against `frontend_new/docs/qa-acceptance-checklist.md`.
6. Run quality gates.
7. Run Protocol C, Protocol D, and Protocol E for end-of-phase QA and exit decisions.
8. Call `iteration-retrospective-capture` and append concise takeaways to `frontend_new/GUARDRAILS.md`.
9. Update `docs/tasklist.md` with meaningful progress.

## Quality Gates

Run all available commands before considering a slice complete:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

If a command does not exist yet, add it early during bootstrap and document it in `frontend_new/README.md`.

## Never Do

- Do not edit legacy `frontend/` for redesign implementation.
- Do not hardcode colors, spacing, or API URLs.
- Do not trust `initDataUnsafe` for identity or authorization.
- Do not ship UI states without loading/error/empty handling.
- Do not block redesign progress waiting for backend parity; define FE contract and queue BE deltas.

## References

- `frontend_new/README.md`
- `frontend_new/GUARDRAILS.md`
- `frontend_new/docs/implementation-roadmap.md`
- `frontend_new/docs/telegram-mini-app-playbook.md`
- `frontend_new/docs/shadcn-tailwind-playbook.md`
- `frontend_new/docs/api-evolution-plan.md`
- `frontend_new/docs/qa-acceptance-checklist.md`
- `frontend_new/docs/decisions.md`
