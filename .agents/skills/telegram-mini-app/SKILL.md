---
name: telegram-mini-app
description: Build, integrate, and debug Telegram Mini Apps (Web Apps) end-to-end. Use when implementing frontend behavior with window.Telegram.WebApp, launch modes (keyboard, inline, menu, inline mode, direct link, attachment menu), native BackButton navigation, fullscreen/safe-area/keyboard behavior, bot-side flows (sendData and answerWebAppQuery), initData validation, or testing Mini Apps across Telegram clients.
---

# Telegram Mini App

## Overview

Use this skill to implement Telegram Mini App features safely and in a way that matches Telegram client behavior.

Follow this skill when a task touches:

- `window.Telegram.WebApp`
- Mini App launch URLs / BotFather launch configuration
- Theme adaptation and safe-area handling
- Main/secondary/back/settings buttons
- `initData` / `initDataUnsafe` auth context
- Bot API interactions tied to Mini App sessions (`answerWebAppQuery`, invoices, inline flows)

## Workflow

1. Determine launch mode and message return path.
2. Initialize Telegram WebApp API early and call `ready()` once essential UI is ready.
3. Build UI with Telegram theme + viewport + safe-area constraints.
4. Gate features by supported Bot API version and launch context.
5. Validate `initData` on backend before trusting user/session context.
6. Test on target Telegram clients (mobile + desktop) and verify events.
7. Apply production guardrails for close behavior, deep links, and observability.

## Step 1: Choose Launch Mode

Read [launch-modes](references/launch-modes.md) before implementing routing or bot response behavior.

Use this shortcut:

- Keyboard button flow: Use `sendData()` for up to 4096 bytes; app closes and bot receives `web_app_data`.
- Inline button / menu / attachment flow: Use `query_id` with `answerWebAppQuery` for messages on behalf of user.
- Direct link / inline mode flow: No direct chat write from Mini App; use inline handoff (`switchInlineQuery`) when needed.

## Step 2: Bootstrap Correctly

Always include Telegram script in `<head>` before app scripts:

```html
<script src="https://telegram.org/js/telegram-web-app.js?62"></script>
```

Implementation requirements:

- Access API through `window.Telegram.WebApp`.
- Call `ready()` as soon as critical UI is mounted.
- Call `expand()` when full-height UX is expected.
- Never trust `initDataUnsafe` for authorization decisions.

For production-ready TS patterns, read [js-api-cheatsheet](references/js-api-cheatsheet.md).

## Step 3: Build Telegram-Native UX

Use Telegram-provided styling and viewport data:

- Prefer CSS variables (`--tg-theme-*`, `--tg-viewport-*`, `--tg-safe-area-*`, `--tg-content-safe-area-*`).
- Use `viewportStableHeight` for sticky/bottom positioning logic.
- Subscribe to relevant events (`themeChanged`, `viewportChanged`, safe-area/fullscreen events).
- Respect mobile-first behavior and low-performance Android devices.
- Treat `contentSafeAreaInset.top` as a lower bound, not proof that native header controls cannot visually overlap content. For fullscreen products, apply `max(content-safe top, product-measured host-controls reserve) + normal content gutter` through one shared shell variable for primary routes and fixed full-page overlays. Measure the reserve on real target clients; do not copy another product's pixel value.
- Keep one intended page scroll container (`min-height: 0` plus overflow) and give it matching top/bottom `scroll-padding`. When an editor gains focus or the viewport changes, scroll the focused field inside that container so it remains visible above the keyboard.

### Navigation Ownership

- Classify routes as primary destinations or nested flows before implementing UI. Keep product navigation on primary destinations; hide it for nested editor, selector, and drilldown flows.
- Use one route-aware `BackButton` adapter for nested-flow return navigation, including handler cleanup. Do not recreate Telegram's native Close or Back chrome in HTML.
- Preserve primary-route state and scroll position when returning from a nested route whenever the framework/router allows it.

See [js-api-cheatsheet](references/js-api-cheatsheet.md).

## Step 4: Wire Telegram Surface APIs

Before using a method, verify:

- Bot API version supports it (`isVersionAtLeast`).
- Launch context allows it (for example, `sendData` only for keyboard-launched apps).
- Method interaction constraints are met (some calls require user gesture).

Method/event map and constraints: [js-api-cheatsheet](references/js-api-cheatsheet.md).

For immersive, scroll-heavy products:

- On Bot API 7.7+, consider `disableVerticalSwipes()` only when the Mini App's own gestures conflict with Telegram's minimize/close gesture.
- On Bot API 8.0+, request fullscreen when the product benefits from it, and handle `fullscreenChanged` and `fullscreenFailed`.
- Treat both calls as requests. Version support, client behavior, and visible host controls can vary; retain a usable non-fullscreen layout.

## Step 5: Enforce Security on Backend

Treat `initData` validation as mandatory.

- Send raw `Telegram.WebApp.initData` to backend.
- Recompute `hash` with HMAC-SHA-256 as documented.
- Reject invalid signature or stale `auth_date`.
- Only then trust `user`, `chat`, `query_id`, `chat_type`, `chat_instance`, `start_param`.

Validation algorithm and backend snippets: [security-auth](references/security-auth.md).

## Step 6: Test and Debug Systematically

- Validate flows in Telegram production clients.
- Use Telegram test environment when needed.
- Enable webview inspection on each platform.
- Test launch-link variants and parameter passing (`startapp`, `startattach`, `tgWebAppStartParam`).
- Use a browser fixture for repeatable route, viewport, and screenshot checks, but require a real Telegram client smoke test for native chrome, keyboard, and fullscreen behavior.

Checklist and per-platform debug instructions: [testing-debugging](references/testing-debugging.md).

## Step 7: Apply Production Guardrails

- Treat `initDataUnsafe` as UI-only data and make all auth decisions from backend-validated `initData`.
- Enable closing confirmation only for dirty states (forms/edits) and disable it after save/cancel.
- Validate and allowlist `start_param` and outbound URLs.
- Add minimal runtime logs for platform/version/launch context and validation outcomes.

Detailed guidance and checklists: [production-guardrails](references/production-guardrails.md).

## Anti-Patterns and Sharp Edges

Avoid these anti-patterns:

1. Trusting `initDataUnsafe` for auth/authorization.
2. Building desktop-first layouts that ignore Telegram mobile viewport constraints.
3. Hardcoding colors instead of Telegram theme variables.
4. Calling newer WebApp methods without `isVersionAtLeast` guards.
5. Registering WebApp event handlers without cleanup on unmount/navigation.

Watch these sharp edges:

1. `sendData` is only for keyboard-button-launched Mini Apps and closes the app.
2. Direct-link and inline-mode launches cannot directly send messages to chat; use inline handoff patterns.
3. Bottom-pinned controls can jump if based on `viewportHeight`; prefer `viewportStableHeight`.
4. Fullscreen and safe-area changes can break layout unless `safeAreaChanged` and `contentSafeAreaChanged` are handled.
5. Fullscreen does not mean Telegram's visible header controls are gone. Do not rely on the reported content-safe top inset alone; use a measured shared reserve and a real-device screenshot.
6. Duplicate in-app close/back controls compete with Telegram navigation. Use product navigation only for primary routes and the host `BackButton` for nested routes.
7. A browser fixture may reset its fake WebApp state on full navigations. Preserve that state or assert lifecycle behavior before navigating away from the route under test.

## Done Criteria

Consider task complete only when:

- Launch mode and response flow are correct for the requested behavior.
- UX adapts to theme/viewport/safe-area updates.
- Backend validates `initData` and rejects invalid signatures.
- Version-gated features include fallback behavior.
- Primary/nested navigation, top host-control clearance, and keyboard focus behavior are verified in the target client.
- Critical user path is verified in Telegram client(s), not only browser.
- Production guardrails (close behavior, deep-link safety, and observability) are implemented.

## Skill Maintenance

If updating this skill itself, follow Agent Skills constraints in [agent-skills-specification](references/agent-skills-specification.md).
