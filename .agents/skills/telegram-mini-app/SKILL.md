---
name: telegram-mini-app
description: Build, integrate, and debug Telegram Mini Apps (Web Apps) end-to-end. Use when implementing frontend behavior with window.Telegram.WebApp, selecting launch modes (keyboard, inline, menu, inline mode, direct link, attachment menu), wiring bot-side flows (sendData and answerWebAppQuery), applying Telegram theme/viewport/safe-area behavior, validating initData on backend, or testing Mini Apps across Telegram clients.
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
<script src="https://telegram.org/js/telegram-web-app.js?61"></script>
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

See [js-api-cheatsheet](references/js-api-cheatsheet.md).

## Step 4: Wire Telegram Surface APIs

Before using a method, verify:

- Bot API version supports it (`isVersionAtLeast`).
- Launch context allows it (for example, `sendData` only for keyboard-launched apps).
- Method interaction constraints are met (some calls require user gesture).

Method/event map and constraints: [js-api-cheatsheet](references/js-api-cheatsheet.md).

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

## Done Criteria

Consider task complete only when:

- Launch mode and response flow are correct for the requested behavior.
- UX adapts to theme/viewport/safe-area updates.
- Backend validates `initData` and rejects invalid signatures.
- Version-gated features include fallback behavior.
- Critical user path is verified in Telegram client(s), not only browser.
- Production guardrails (close behavior, deep-link safety, and observability) are implemented.

## Skill Maintenance

If updating this skill itself, follow Agent Skills constraints in [agent-skills-specification](references/agent-skills-specification.md).
