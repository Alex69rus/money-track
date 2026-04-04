# QA Acceptance Checklist

Use this checklist for every redesign slice and before release.

Execution requirement:
- At the end of each phase, run this checklist via a dedicated QA sub-agent in browser (Chrome DevTools MCP) for the FR IDs mapped to that phase.
- Do not mark a phase complete until QA sub-agent results are recorded with pass/fail and any console/network issues.
- Preferred deterministic fallback for local runs: `npm run qa:phase -- <phase-id>` from repo root (`phase2` implemented, `phase3` scaffolded with TODO checks).

## A. App Shell and Navigation

- [ ] Four tabs are present: Transactions, Analytics, AI Chat, Settings.
- [ ] Default route is Transactions.
- [ ] Top header and bottom nav are persistent across routes.
- [ ] On mobile keyboard open, bottom nav does not block focused input.
- [ ] Settings tab opens a valid stub surface.

## B. Transactions Domain

- [ ] Filters include text, date range, categories, tags, amount range.
- [ ] Filter updates auto-apply with debounce and do not spam requests.
- [ ] List has loading, error-with-retry, and empty states.
- [ ] Long histories load incrementally (pagination/infinite scroll).
- [ ] Amount sign semantics are preserved (`+` income, `-` expense).
- [ ] Category edit opens dedicated selector with grouped search and explicit confirm.
- [ ] Tag edit opens dedicated selector with explicit confirm.
- [ ] Full edit surface opens prefilled and validates required fields.
- [ ] Delete action requires explicit confirmation.
- [ ] Update/delete reflect in list in-place without full page reload.

## C. Analytics Domain

- [ ] Date range controls affect all widgets consistently.
- [ ] Summary stats, category spend, tag spend, and trends are shown.
- [ ] Loading, error-with-retry, and no-data states exist.
- [ ] Category drilldown opens popup/list with explicit close.
- [ ] Closing drilldown returns to analytics with context preserved.

## D. AI Chat Domain

- [ ] Timeline renders user and assistant messages distinctly.
- [ ] Send works via button and Enter.
- [ ] Shift+Enter inserts newline.
- [ ] Pending assistant state is shown during request.
- [ ] Reset requires confirmation and creates fresh session.
- [ ] Failures show clear user-visible recovery/fallback behavior.

## E. Telegram Mini App Compatibility

- [ ] `ready()` and `expand()` lifecycle behavior is correct.
- [ ] Theme and safe-area variables are respected.
- [ ] Event listeners are unsubscribed on cleanup.
- [ ] Unsupported methods are guarded with version checks.
- [ ] App behavior is verified in Telegram iOS, Android, and Desktop clients.

## F. API and Resilience

- [ ] Requests include `X-Telegram-Init-Data`.
- [ ] API base URL is env-driven.
- [ ] Tag options come from backend endpoint and are reused by filter/edit.
- [ ] Controlled fallback exists when backend is unavailable in dev/test.

## G. Accessibility and Recovery

- [ ] Interactive controls have labels/semantic text.
- [ ] Async actions show visible progress indicators.
- [ ] Recoverable failures provide retry or clear next step.

## H. Compatibility Decisions

- [x] Category filtering behavior is explicitly constrained to single category selection.
- [x] Currency policy is explicitly set to keep multi-currency support in edit flow.
- [ ] No extra product tabs/screens beyond approved scope are introduced.
