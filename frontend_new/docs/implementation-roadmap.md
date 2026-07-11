# Frontend Redesign Roadmap

This roadmap is the execution order for building `frontend_new` from scratch.

Source contract:
- `docs/frontend-redesign-requirements/functional-requirements.md`
- `docs/frontend-redesign-requirements/user-flows.md`
- `docs/frontend-redesign-requirements/current-ux.md`
- `frontend_new/docs/decisions.md`

## Visual Fidelity Rule

- For each phase, load the matching draft from `docs/frontend-redesign-requirements/redesign_ui_drafts/**`.
- The redesigned UI must stay close to approved screenshots while still following shadcn/Tailwind v4 and Telegram Mini App constraints.
- `code.html` files are implementation starting points, not copy-paste output.

## Phase Plan

Current status: Phases 0-5 establish functional parity and integration hardening. They are not considered the final visual-fidelity pass. The next track is mandatory because the current `frontend_new` implementation does not yet closely match the approved `redesign_ui_drafts` screens.

| Phase | Goal | Primary FR IDs | Key Deliverables | Exit Criteria |
|---|---|---|---|---|
| Phase 0 | Foundation and app shell | FR-001, FR-002, FR-003, FR-004, FR-005, FR-029 | Vite+TS app, Tailwind v4, shadcn init, Telegram bootstrap, header + 4-tab nav, Settings stub, AI chat backend stub wiring | App runs in dev; default route is Transactions; keyboard-safe bottom nav |
| Phase 1 | Transactions list and filters | FR-006, FR-007, FR-008, FR-009, FR-017, FR-032, FR-034, FR-036, FR-037 | Filter panel, debounced auto-apply, loading/error/empty states, incremental loading, mobile+desktop list variants | Transactions flow works end-to-end with retry and pagination |
| Phase 2 | Transaction edit surfaces | FR-010, FR-011, FR-012, FR-013, FR-014, FR-015, FR-016, FR-035 | Category selector (grouped + confirm), tag selector (confirm), full edit surface with validation, delete confirm | In-place update/delete with no full reload; explicit confirmations in selectors |
| Phase 3 | Analytics and drilldown | FR-018, FR-019, FR-020, FR-021, FR-022 | Analytics widgets, date-range recompute, no-data states, category drilldown popup with close action | Analytics and drilldown keep context and recover from failures |
| Phase 4 | AI Chat | FR-023, FR-024, FR-025, FR-026, FR-027 | Timeline UI, Enter/Shift+Enter behavior, pending state, reset confirmation, failure handling | Chat interaction is stable and recoverable across request errors |
| Phase 5 | Integration hardening | FR-028, FR-030, FR-031, FR-033, FR-040 | API adapter hardening, user tags integration, fallback mode, cross-device QA | Release checklist passes and deferred contracts are tracked |

## Visual Alignment Track

This track follows the functional phases and is now the primary next step. The objective is to make `frontend_new` visually match the approved drafts while preserving every FR already implemented in Phases 0-5.

This frontend is for a Telegram Web App and is expected to be used almost entirely on phones. Visual alignment must optimize for the phone screen first; desktop/laptop layouts are secondary compatibility checks.

### Next Agent Start Here

Start with `VF-0`. Do not spend time rediscovering whether the app is implemented: it is. The known gap is visual fidelity to the approved drafts.

Recommended `VF-0` output:

- a short gap list for each draft folder,
- current app screenshots at the primary Telegram phone viewport: 390x844 (iPhone 12 Pro device emulation),
- extracted visual tokens and repeated layout patterns from the drafts,
- the exact first implementation slice for `VF-1`,
- any deviations that should be approved before implementation.

| Phase | Goal | Draft Source | Key Deliverables | Exit Criteria |
|---|---|---|---|---|
| VF-0 | Visual audit and token extraction | All `redesign_ui_drafts/**` folders | Side-by-side current-vs-draft inventory, shared spacing/type/color/radius/elevation tokens, reusable layout notes from each `code.html` | Audit captures concrete gaps per screen; no implementation starts without gap list and screenshots |
| VF-1 | App shell and transactions home alignment | `home_screen_with_transactions_nav/` | Header, bottom nav, page frame, transaction list/card/table styling, filter entry treatment aligned to draft | 390x844 browser screenshot shows close structural match to `screen.png`; Phase 1/2 QA still passes |
| VF-2 | Transaction detail popup alignment | `transaction_detail_pop_up/` | Edit dialog/sheet layout, field grouping, destructive action placement, save/cancel affordances aligned to draft | Full edit, validation, save, and delete flows still pass Phase 2 QA; popup screenshot matches draft structure |
| VF-3 | Category selector alignment | `category_selector_expandable_groups/` | Grouped expandable category selector with draft-matching search, hierarchy, selected state, and confirm action | Category quick-edit still passes FR-010/FR-011/FR-016; selector screenshot matches draft structure |
| VF-4 | Tag selector alignment | `tag_selector_chip_grid_layout/` | Chip grid, search/add affordance, selected/unselected tag states, and update action aligned to draft | Tag edit still passes FR-012/FR-016; selector screenshot matches draft structure |
| VF-5 | Analytics dashboard alignment | `analytics_with_transactions_nav/` | Analytics page layout, summary widgets, category/tag/trend sections, nav consistency aligned to draft | Phase 3 QA still passes; 390x844 analytics screenshot matches draft hierarchy |
| VF-6 | Analytics drilldown popup alignment | `category_transactions_pop_up_with_close_button/` | Category transactions popup, header summary, list styling, explicit close placement aligned to draft | Drilldown still passes FR-022; popup screenshot matches draft structure and preserves analytics context |

## Telegram-Native UX Refactor Track

Status: implemented in browser/Telegram-fixture QA on 2026-07-11; real Telegram iOS confirmation is still required before declaring the client-specific UX complete.

### TWA-1 — Full-page, Telegram-native navigation and input experience

Product direction: match the native flow demonstrated by BotFather on Telegram iOS. Moving from one Money Track section to another must feel like entering a new page, not opening a web-dialog over the existing page. Telegram's host navigation must own return navigation; the web app must not duplicate that header/back experience.

Reference material to add before implementation:

- Create `frontend_new/docs/references/telegram-native-ux/` and place the supplied files there unchanged:
  - `IMG_7775.PNG` — BotFather root/list page with host chrome only.
  - `IMG_7776.PNG` — nested BotFather settings page with Telegram `Back`.
  - `IMG_7777.PNG` and `IMG_7778.PNG` — focused editing fields, keyboard, viewport position, and host `Back`.
- Keep the existing smoke-test evidence in `frontend_new/bugs_reports/` separate; it documents defects, while this folder is a native-UX reference set.
- Use the current official references during implementation:
  - [Telegram Mini Apps JS API](https://core.telegram.org/bots/webapps)
  - [Telegram web events / BackButton](https://core.telegram.org/api/web-events#web-app-setup-back-button)
  - [Telegram Mini App fullscreen and safe-area behavior](https://core.telegram.org/bots/webapps#initializing-mini-apps)

#### Required UX outcomes

1. Full-page route transitions
   - Promote route-level flows currently presented as dialogs/sheets to explicit pages: transaction detail/edit, category selection, tag selection, analytics drilldown, and future complete category/tag breakdowns.
   - Preserve short, interruptive confirmations (for example destructive delete confirmation) as dialogs only when a full page would be disproportionate.
   - A new route must preserve the parent page's filter, scroll, and date-range context so returning is lossless.

2. Telegram host back navigation
   - Use `window.Telegram.WebApp.BackButton` for every non-root route.
   - Show the host back button when the app has an in-app return destination; hide it at root destinations.
   - On its click, return through the app's route history and restore parent state. Do not render a duplicate web-app back header or custom `Back` button for the same action.
   - Clean up the `BackButton` event listener on route change/unmount. Keep browser history/back as a development-mode fallback when the Telegram object is absent.

3. Remove duplicate app chrome in Telegram
   - Remove the persistent `Money Track` web header/title frame from the Telegram-native route flow; it consumes vertical space already owned by the Telegram host.
   - Keep the four-destination bottom navigation on primary pages. Hide it only for nested full-page flows, where Telegram's BackButton owns return navigation, and while the keyboard is open.
   - On Bot API 7.7+, call `disableVerticalSwipes()` to prevent content-surface swipe-to-minimize. On Bot API 8.0+, request fullscreen at startup and after a host exit. Both calls must be version-gated with a normal-host fallback; Telegram can still decline fullscreen or keep its own header controls.
   - Apply `contentSafeAreaInset.top` to all primary content and fixed full-page surfaces so Telegram service controls never overlap the app.
   - Keep the Telegram host's header/background colors intentional via supported WebApp APIs; never fake host controls in HTML/CSS.

4. Smooth focus and keyboard behavior
   - When an editable field receives focus, smoothly bring that field into the visible editing position near the top of the usable content area before/while the keyboard opens. Do not leave it hidden below fixed controls or behind Telegram chrome.
   - Coordinate focus scrolling with `visualViewport`, `WebApp.viewportChanged`, `viewportHeight`, `viewportStableHeight`, safe-area events, and `contentSafeAreaInset`.
   - Use stable viewport height for pinned controls; do not animate bottom-pinned UI from transient `viewportHeight` values.
   - Avoid scroll loops, abrupt page jumps, and `100vh` assumptions. Preserve the user's prior scroll position when focus closes or when they navigate back.

5. Safety and compatibility
   - Call `ready()` and `expand()` as part of the existing bootstrap; version-gate `BackButton`, fullscreen, safe-area, and other newer API usage.
   - Do not trust `initDataUnsafe`; this is an interaction refactor, not an auth exception.
   - Test iOS Telegram first, then Android and Telegram Desktop; browser-only success is insufficient.

#### Implementation order

1. Write a route/state map for the four root destinations and all flows promoted from sheets/dialogs.
2. Add one central Telegram navigation adapter: BackButton visibility, click subscription cleanup, browser fallback, and route-history policy.
3. Refactor one vertical flow end-to-end (Transactions list → edit → category/tags → return) before changing Analytics or AI Chat.
4. Apply the same model to analytics drilldown and future `View all` pages.
5. Remove only the duplicate title header after primary navigation and host-back behavior are proven on a physical iPhone; retain the approved primary bottom navigation.
6. Add focus/keyboard coordination and validate every editable field on a real iPhone.

#### Exit criteria

- Telegram launches to Transactions and the four primary destinations retain bottom navigation, with no persistent duplicate `Money Track` title frame.
- Every nested page shows Telegram's BackButton, returns correctly, and restores parent context.
- Vertical swipes are disabled where the Bot API supports it; fullscreen is requested where supported, with an explicit normal-host fallback if Telegram declines it.
- All primary and fixed full-page surfaces stay below Telegram's content-safe top inset.
- No route-level edit/selector/drilldown flow relies on a popup/sheet as its primary navigation surface.
- Focusing any editable field produces a smooth, visible editing position with the keyboard open and no controls overlapping it.
- The four BotFather reference images and new Money Track iPhone recordings/screenshots are compared side-by-side in the implementation report.
- The existing mobile QA matrix is extended for the route/back/focus flows, and a real Telegram iOS smoke test passes.

#### Implementation record (2026-07-11)

- Restored Transactions-first launch and the four-destination bottom navigation on Telegram primary pages; browser-development mode keeps its header as a local-development fallback.
- Added central Telegram BackButton lifecycle management and URL-backed page flows for transaction edit, category selection, tag selection, and analytics category drilldown.
- Removed duplicate in-page back/close actions from those Telegram page flows. Explicit save/update/delete confirmation actions remain.
- Added focused-field positioning for `visualViewport` and Telegram `viewportChanged`, including keyboard-sized trailing scroll space.
- Added version-gated vertical-swipe suppression (Bot API 7.7+) and fullscreen requests/re-requests (Bot API 8.0+), with normal-host fallback when Telegram declines the host request.
- Applied the content-safe top inset to primary and fixed full-page surfaces, and extended the mobile fixture/QA matrix with safe-top, primary-nav, BackButton, fullscreen, swipe, route-return, and simulated keyboard-resize checks.
- Remaining exit item: validate this exact flow in Telegram on a real iPhone with the configured test bot/domain.

#### Future skill/playbook update

At the start of TWA-1, update the project-local `frontend_new/docs/telegram-mini-app-playbook.md` and `frontend_new/AGENTS.MD` with the validated BackButton, full-page route, focus-scroll, and fullscreen do/don't rules. Do not edit the shared `telegram-mini-app` skill in advance; propose any shared-skill change only after this project flow has been validated on real Telegram clients.

## Visual Alignment Working Rules

1. Treat `screen.png` as the visual target and `code.html` as the structural starting point for each VF phase.
2. Preserve existing functional behavior and API boundaries; visual changes must not weaken Phases 0-5 FR coverage.
3. Use shadcn primitives and Tailwind v4 tokens, but adapt composition until it matches the draft rather than accepting generic shadcn defaults.
4. Maintain Telegram-safe layout constraints: safe-area padding, stable viewport height, keyboard-safe bottom nav, reachable sticky actions.
5. Add or keep `data-testid` hooks for every FR-critical control before visual refactors so QA assertions do not become fragile.
6. For each VF phase, capture current app screenshots before and after implementation at 390x844 with DPR 3 device emulation. This is the primary target because the app is a Telegram Web App used primarily on phones.
7. End-of-phase gate: run the relevant phase QA module plus visual browser review against the matching draft screenshot. Record known deviations explicitly.

## Vertical Slice Rules

1. Each slice must reference specific FR IDs.
2. Each slice must include loading, error, and retry behaviors where network is involved.
3. Each slice must preserve Telegram-safe viewport behavior.
4. Each slice must be validated against `frontend_new/docs/qa-acceptance-checklist.md`.
5. End-of-phase gate: spawn a QA sub-agent and run browser verification with Chrome DevTools MCP for that phase's FR IDs; include explicit pass/fail notes and console/network findings.
6. Avoid broad refactors until core behavior parity is in place.

## Draft-to-Implementation Mapping

- `home_screen_with_transactions_nav`: app shell and transactions surface direction.
- `analytics_with_transactions_nav`: analytics structure and nav consistency.
- `transaction_detail_pop_up`: full edit surface direction.
- `category_selector_expandable_groups`: grouped category selector with explicit update.
- `tag_selector_chip_grid_layout`: dedicated tag selector with explicit update.
- `category_transactions_pop_up_with_close_button`: analytics drilldown popup with explicit close.

Screenshot drafts define the visual target and interaction direction; FR IDs remain authoritative for behavior.
