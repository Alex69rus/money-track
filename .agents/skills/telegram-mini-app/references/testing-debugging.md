# Testing and Debugging

Use this file to verify Mini App behavior in real Telegram clients.

## Test Matrix

1. Launch paths
- keyboard button
- inline/menu button
- direct link (`startapp`, optional `mode=compact`)
- attachment menu (`startattach`)

2. Devices/clients
- iOS Telegram
- Android Telegram
- Telegram Desktop / macOS app when relevant

3. Scenarios
- initial load + `ready()` timing
- theme switch while app open
- viewport expansion/collapse
- safe area changes (fullscreen + rotated device)
- button events and cleanup

## Telegram Test Environment

- Use Telegram test server accounts and bot.
- Bot API endpoint format includes `/test/` segment.
- In test environment, HTTP (non-TLS) Mini App links can be used for local testing.

## WebView Inspection

- iOS: enable Allow Web View Inspection, inspect via Safari Develop menu.
- Android: enable USB debugging + Telegram WebView debug; inspect via `chrome://inspect/#devices`.
- Telegram Desktop beta (Windows/Linux): enable webview inspection in experimental settings.
- Telegram macOS beta: enable debug mini apps and inspect element.

## Diagnostics Checklist

- Confirm script inclusion order (`telegram-web-app.js` before app scripts).
- Log and verify `version`, `platform`, launch params, and whether app is inside Telegram.
- Verify `isVersionAtLeast` guards around newer methods.
- Verify event subscription and unsubscription around navigation/unmount.
- Validate backend signature errors are explicit and observable.

## Common Failure Patterns

- Works in browser, fails in Telegram client:
  - Missing WebApp script or incorrect initialization timing.
- User context mismatch:
  - Using `initDataUnsafe` directly on backend.
- Missing callbacks from method call:
  - Method unavailable in current version/context.
- Layout overlap with Telegram controls:
  - Ignoring safe-area/content-safe-area insets.
