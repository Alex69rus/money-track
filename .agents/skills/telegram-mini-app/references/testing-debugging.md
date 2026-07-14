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
- primary-destination navigation versus nested-route `BackButton` return
- top content clearance from native Close/menu controls in fullscreen and normal-host modes
- focused editor visibility while the keyboard opens, closes, and changes the viewport

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
- Record the target device, Telegram version, launch mode, and a screenshot when calibrating the product's host-controls reserve.
- Exercise every primary destination and at least one nested full-page flow on the smallest supported phone profile.
- Use a fixture for repeatable browser checks, but separately verify native header controls, fullscreen behavior, BackButton, and keyboard positioning in Telegram on a real device.
- Keep fixture lifecycle state across route navigations, or assert lifecycle counters before navigation resets the fixture.

## Common Failure Patterns

- Works in browser, fails in Telegram client:
  - Missing WebApp script or incorrect initialization timing.
- User context mismatch:
  - Using `initDataUnsafe` directly on backend.
- Missing callbacks from method call:
  - Method unavailable in current version/context.
- Layout overlap with Telegram controls:
  - Treating safe-area/content-safe-area insets as the exact visual boundary of native controls.
  - Measure the target launch mode on a real device, apply one shared host-controls reserve plus content gutter, and verify every primary page rather than adding per-page offsets.
- Nested flow has duplicate navigation or loses context on return:
  - The app owns primary navigation while Telegram owns the nested-flow BackButton; centralize visibility/cleanup in one route-aware adapter.
- Focused input is hidden by keyboard or a sticky action:
  - The wrong element owns scrolling, or the page lacks stable-height sizing and matching `scroll-padding`; fix the shared page shell before changing an individual form field.
