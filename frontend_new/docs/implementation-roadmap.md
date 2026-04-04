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

| Phase | Goal | Primary FR IDs | Key Deliverables | Exit Criteria |
|---|---|---|---|---|
| Phase 0 | Foundation and app shell | FR-001, FR-002, FR-003, FR-004, FR-005, FR-029 | Vite+TS app, Tailwind v4, shadcn init, Telegram bootstrap, header + 4-tab nav, Settings stub, AI chat backend stub wiring | App runs in dev; default route is Transactions; keyboard-safe bottom nav |
| Phase 1 | Transactions list and filters | FR-006, FR-007, FR-008, FR-009, FR-017, FR-032, FR-034, FR-036, FR-037 | Filter panel, debounced auto-apply, loading/error/empty states, incremental loading, mobile+desktop list variants | Transactions flow works end-to-end with retry and pagination |
| Phase 2 | Transaction edit surfaces | FR-010, FR-011, FR-012, FR-013, FR-014, FR-015, FR-016, FR-035 | Category selector (grouped + confirm), tag selector (confirm), full edit surface with validation, delete confirm | In-place update/delete with no full reload; explicit confirmations in selectors |
| Phase 3 | Analytics and drilldown | FR-018, FR-019, FR-020, FR-021, FR-022 | Analytics widgets, date-range recompute, no-data states, category drilldown popup with close action | Analytics and drilldown keep context and recover from failures |
| Phase 4 | AI Chat | FR-023, FR-024, FR-025, FR-026, FR-027 | Timeline UI, Enter/Shift+Enter behavior, pending state, reset confirmation, failure handling | Chat interaction is stable and recoverable across request errors |
| Phase 5 | Integration hardening | FR-028, FR-030, FR-031, FR-033, FR-040 | API adapter hardening, user tags integration, fallback mode, cross-device QA | Release checklist passes and deferred contracts are tracked |

## Vertical Slice Rules

1. Each slice must reference specific FR IDs.
2. Each slice must include loading, error, and retry behaviors where network is involved.
3. Each slice must preserve Telegram-safe viewport behavior.
4. Each slice must be validated against `frontend_new/docs/qa-acceptance-checklist.md`.
5. Avoid broad refactors until core behavior parity is in place.

## Draft-to-Implementation Mapping

- `home_screen_with_transactions_nav`: app shell and transactions surface direction.
- `analytics_with_transactions_nav`: analytics structure and nav consistency.
- `transaction_detail_pop_up`: full edit surface direction.
- `category_selector_expandable_groups`: grouped category selector with explicit update.
- `tag_selector_chip_grid_layout`: dedicated tag selector with explicit update.
- `category_transactions_pop_up_with_close_button`: analytics drilldown popup with explicit close.

Screenshot drafts define the visual target and interaction direction; FR IDs remain authoritative for behavior.
