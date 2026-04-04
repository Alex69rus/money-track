# Telegram Mini App Playbook

This document applies the `telegram-mini-app` skill to `frontend_new`.

## Launch Context Assumptions

Current redesign should assume menu/direct-link style launch for daily usage.

- Do not rely on keyboard-only `sendData()` flow for core product actions.
- If launch mode changes, re-check message return path and required bot-side integration.

## Bootstrap Contract

1. Add Telegram script in `index.html` head:
   - `https://telegram.org/js/telegram-web-app.js?61`
2. Create a typed helper to access `window.Telegram?.WebApp`.
3. On app startup:
   - call `ready()` after critical UI is rendered,
   - call `expand()` for full-height UX.
4. Initialize listeners and cleanup on unmount.

## Theme, Viewport, and Safe Area

- Prefer Telegram theme variables (`--tg-theme-*`) in global styles.
- Use Telegram viewport and safe-area values for shell layout:
  - `--tg-viewport-height`
  - `--tg-viewport-stable-height`
  - `--tg-safe-area-*`
  - `--tg-content-safe-area-*`
- Base bottom-pinned controls on stable viewport height.
- Recompute layout on:
  - `themeChanged`
  - `viewportChanged`
  - `safeAreaChanged`
  - `contentSafeAreaChanged`
  - `fullscreenChanged`

## Method Safety

- Always gate newer methods with `isVersionAtLeast`.
- Keep method usage context-safe (for example `sendData` only where launch context allows it).
- Never leave event handlers registered across route changes.

## Security Contract

- `initDataUnsafe` is for UI hints only.
- Send raw `initData` to backend on privileged API requests.
- Backend validates Telegram hash and `auth_date`.
- Reject stale or invalid sessions before serving protected data.

## UX Guardrails

- Show close confirmation only for dirty form/edit states.
- Disable close confirmation after save/discard/reset.
- Validate and allowlist deep-link parameters (`start_param`) if used.
- Keep minimal telemetry for launch context, platform, version, and auth validation result category.

## Test Matrix (Minimum)

1. Telegram iOS client:
   - keyboard open/close with bottom nav,
   - modal/sheet stability during input.
2. Telegram Android client:
   - viewport changes,
   - scroll behavior with sticky actions.
3. Telegram Desktop:
   - baseline functionality and layout fit.
4. Browser dev mode:
   - controlled fallback behavior when Telegram object is absent.
