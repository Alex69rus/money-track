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
  - `requestFullscreen`, `exitFullscreen`
  - `hideKeyboard`
  - `requestChat`

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
