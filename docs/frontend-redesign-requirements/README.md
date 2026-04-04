# Frontend Redesign Requirements Pack

## Purpose
This package documents the current frontend behavior and approved redesign-target behavior as the functional baseline for a future UI redesign (Tailwind v4 + shadcn).

The goal is to preserve product behavior while allowing visual and structural changes.

## Scope
- Current web app user experience and behavior (as implemented in `frontend/src/**`)
- Current user flows and edge cases
- Functional requirements for future frontend implementation
- Mapping to redesign draft screenshots in `docs/frontend-redesign-requirements/redesign_ui_drafts/**` (screenshots only)

## Source of Truth
- `frontend/src/**`
- `docs/vision.md`
- `docs/idea.md`
- `docs/conventions.md`

## Documents
- [Current UX Baseline](./current-ux.md)
- [User Flows](./user-flows.md)
- [Functional Requirements](./functional-requirements.md)

## Screenshot Reference Map
These draft screenshots are visual references for upcoming redesign work and were used to align target UX requirements.

- `docs/frontend-redesign-requirements/redesign_ui_drafts/home_screen_with_transactions_nav/screen.png`: home + transactions nav direction
- `docs/frontend-redesign-requirements/redesign_ui_drafts/analytics_with_transactions_nav/screen.png`: analytics dashboard direction
- `docs/frontend-redesign-requirements/redesign_ui_drafts/transaction_detail_pop_up/screen.png`: edit transaction modal direction
- `docs/frontend-redesign-requirements/redesign_ui_drafts/category_selector_expandable_groups/screen.png`: grouped category picker with explicit confirmation
- `docs/frontend-redesign-requirements/redesign_ui_drafts/tag_selector_chip_grid_layout/screen.png`: tag selection with explicit update action
- `docs/frontend-redesign-requirements/redesign_ui_drafts/category_transactions_pop_up_with_close_button/screen.png`: analytics category drilldown popup with close action

## How To Use In Redesign
1. Treat `functional-requirements.md` as the implementation contract.
2. Use `current-ux.md` to understand legacy behaviors and constraints.
3. Use `user-flows.md` to validate end-to-end interactions during QA.
4. Treat approved screenshot-aligned behaviors in `functional-requirements.md` as product decisions (for example Settings stub tab, explicit category/tag confirmation flows, analytics category drilldown popup).
