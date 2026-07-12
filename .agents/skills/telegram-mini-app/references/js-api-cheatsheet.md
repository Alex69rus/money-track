# JS API Cheatsheet

Use this file for implementation details around `window.Telegram.WebApp`.

## Bootstrap Pattern

```ts
export function getTelegramWebApp() {
  return typeof window !== "undefined" ? window.Telegram?.WebApp : undefined;
}

const tg = getTelegramWebApp();
if (tg) {
  tg.ready();
  tg.expand();
}
```

## Core Fields

- `initData`: raw query string for backend validation.
- `initDataUnsafe`: parsed object, convenient but untrusted.
- `version`: Bot API version available in client.
- `platform`: telegram client platform.
- `colorScheme`, `themeParams`: theming context.
- `viewportHeight`, `viewportStableHeight`: visible area.
- `safeAreaInset`, `contentSafeAreaInset`: avoid overlap with system/telegram chrome.

## Theme and Layout Rules

- Drive colors from Telegram CSS variables (`--tg-theme-*`).
- Treat `viewportStableHeight` as baseline for bottom-pinned controls.
- Listen for changes and re-render:
  - `themeChanged`
  - `viewportChanged`
  - `safeAreaChanged`
  - `contentSafeAreaChanged`
  - `fullscreenChanged`

## Host Chrome, Fullscreen, and Safe Geometry

Use `contentSafeAreaInset` as the Telegram-provided minimum, then add a product-specific reserve for any native controls that remain visible in the target launch mode. Derive that reserve from a real client capture; do not assume a value from another Mini App.

```css
:root {
  --app-host-controls-reserve: 0px; /* Set from real-client measurement. */
  --app-content-top: max(
    var(--tg-content-safe-area-inset-top, 0px),
    var(--app-host-controls-reserve)
  );
}

.app-scroll-root {
  min-height: 0;
  overflow-y: auto;
  padding-top: calc(var(--app-content-top) + var(--app-content-gutter, 1rem));
  scroll-padding-block: calc(var(--app-content-top) + var(--app-content-gutter, 1rem))
    calc(var(--tg-content-safe-area-inset-bottom, 0px) + var(--app-bottom-gutter, 1rem));
}
```

Apply the same top rule to fixed full-page overlays. Recompute CSS variables on safe-area and fullscreen events. Keep a usable normal-host layout because fullscreen can be declined and the native Close/menu controls can remain visible.

For keyboard behavior, make the intended page root the only scrolling container, then scroll a focused editor into that container's visible range after focus and after a stable viewport update. Avoid relying on `100vh` or window scrolling when the actual scroll owner is a nested page container.

## Native Navigation Pattern

- Define primary destinations and nested flows in the router before adding controls.
- Show the product's persistent navigation only on primary destinations.
- For a nested editor, selector, detail, or drilldown route: show `BackButton`, bind it to route return, and hide/unbind it on cleanup.
- Do not add an HTML imitation of Telegram's Close/Back controls. Preserve the primary route's state and scroll position on return where the router supports it.

## Frequently Used Methods

- Session/UI lifecycle:
  - `ready()`, `expand()`, `close()`
  - `isVersionAtLeast(version)`

- Navigation and links:
  - `openLink(url, options)`
  - `openTelegramLink(url)`
  - `switchInlineQuery(query, choose_chat_types?)`

- Messaging and permissions:
  - `sendData(data)` (keyboard-launch only)
  - `requestWriteAccess()`
  - `requestContact()`

- UX surfaces:
  - `showPopup`, `showAlert`, `showConfirm`
  - `showScanQrPopup`, `closeScanQrPopup`, `readTextFromClipboard`
  - `openInvoice`

- Newer capability highlights:
  - `disableVerticalSwipes()` (Bot API 7.7+; use only for a real gesture conflict)
  - `requestFullscreen`, `exitFullscreen` (Bot API 8.0+)
  - `hideKeyboard`
  - `requestChat`

Fullscreen also adds `safeAreaInset`, `contentSafeAreaInset`, `isFullscreen`, and the events `safeAreaChanged`, `contentSafeAreaChanged`, `fullscreenChanged`, and `fullscreenFailed` (Bot API 8.0+). Treat fullscreen as a host request, not a guarantee.

## Button Objects

- `BackButton`
  - `show()`, `hide()`, `onClick()`, `offClick()`
- `MainButton` / `SecondaryButton` (Bottom buttons)
  - control text/color/visibility/activity
  - handle `mainButtonClicked` / `secondaryButtonClicked`

## Event Handling Template

```ts
const tg = window.Telegram?.WebApp;
if (tg) {
  const onMain = () => {
    // submit action
  };
  tg.onEvent("mainButtonClicked", onMain);

  // cleanup on unmount
  // tg.offEvent("mainButtonClicked", onMain);
}
```

Always unregister handlers in framework cleanup hooks.

## Version Gating Pattern

```ts
if (tg?.isVersionAtLeast("9.1")) {
  tg.hideKeyboard();
}
```

Do not call newer methods without `isVersionAtLeast` guards.
