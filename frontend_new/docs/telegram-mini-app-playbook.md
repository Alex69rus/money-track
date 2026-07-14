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
   - call `expand()` for full-height UX,
   - on Bot API 7.7+, call `disableVerticalSwipes()` to prevent vertical content gestures from minimizing the Mini App,
   - on Bot API 8.0+, request fullscreen.
4. Initialize listeners and cleanup on unmount.

Fullscreen is a Telegram host request, not an irreversible app setting. Re-request it after `fullscreenChanged` only when `isFullscreen` is `false`; keep a usable normal-host layout when it fails or is unsupported. Telegram may still expose its own header controls, and disabling vertical swipes does not remove the header swipe gesture.

## Theme, Viewport, and Safe Area

- Prefer Telegram theme variables (`--tg-theme-*`) in global styles.
- Use Telegram viewport and safe-area values for shell layout:
  - `--tg-viewport-height`
  - `--tg-viewport-stable-height`
  - `--tg-safe-area-*`
  - `--tg-content-safe-area-*`
- Base bottom-pinned controls on stable viewport height.
- Apply the greater of `contentSafeAreaInset.top` and the product's 5rem fullscreen host-controls reserve, followed by the normal 1rem content gutter, to the primary app surface and every fixed full-page overlay. Apply the bottom inset to persistent navigation and sticky actions.
- Recompute layout on:
  - `themeChanged`
  - `viewportChanged`
  - `safeAreaChanged`
  - `contentSafeAreaChanged`
  - `fullscreenChanged`
- Keep both stable and current viewport heights available to page content. Use their difference to add temporary trailing scroll space for focused lower fields while the keyboard is open.

## Native Route and Back Contract

- Use one central adapter for `window.Telegram.WebApp.BackButton`; show it only on nested routes and always remove the click listener on route change/unmount.
- Telegram opens Transactions. Keep the four primary destinations in persistent bottom navigation; hide it for nested routes and while the keyboard is open.
- Full-page routes own transaction edit, category/tag selection, and analytics drilldown. Do not use an HTML back/close control for the same action in Telegram.
- Preserve a browser-history fallback when `window.Telegram.WebApp` is absent. The browser-only shell retains its header and bottom navigation for local development.
- Treat short destructive confirmations as dialogs, not route-level navigation.
- Request fullscreen by default only on Bot API 8.0+ and validate the exact host behavior on real iOS before claiming client-native parity.

## Focus and Keyboard Contract

- On `focusin` for a text input, textarea, select, or contenteditable control, smoothly scroll its nearest declared scroll container toward the top editing position.
- Repeat the positioning after `visualViewport.resize` and Telegram `viewportChanged`; do not scroll the page back on blur.
- Mark page-local scroll containers explicitly so a fixed full-page surface, not the hidden parent route, receives the focus scroll adjustment.

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
   - host BackButton on every full-page return route,
   - keyboard open/close and focused lower-field position,
   - no duplicate web header or in-page back control; primary bottom navigation remains visible,
   - fullscreen and vertical-swipe behavior, including the normal-host fallback,
   - content starts below the Telegram service-control inset.
2. Telegram Android client:
   - viewport changes,
   - scroll behavior with sticky actions.
3. Telegram Desktop:
   - baseline functionality and layout fit.
4. Browser dev mode:
   - controlled fallback behavior when Telegram object is absent.
