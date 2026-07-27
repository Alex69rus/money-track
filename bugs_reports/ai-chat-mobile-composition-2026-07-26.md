# AI Chat mobile composition findings — 2026-07-26

Scope: User-reported review of the AI Chat primary route on a phone.

This report records the observed UI defects before remediation.

## Evidence

| File | Surface | Highlight |
| --- | --- | --- |
| `/var/folders/7n/v0vkr6fx777gcbgmqwksgywc0000gn/T/codex-clipboard-ba7f6212-b2ee-483a-982c-754c591f871f.png` | Current AI Chat | The title, description, prompt chips, conversation card, labels, and oversized composer leave little room for the dialogue. |
| `/var/folders/7n/v0vkr6fx777gcbgmqwksgywc0000gn/T/codex-clipboard-9af2673f-783d-4aca-b67a-f52051947351.png` | Current AI Chat while scrolling | The page-level surface scrolls the title, New chat action, and composer together with the transcript. |
| `/var/folders/7n/v0vkr6fx777gcbgmqwksgywc0000gn/T/codex-clipboard-11c3d52b-8ab0-415c-a2aa-4c2cac8f7f5d.png` | Desired reference | Compact persistent top actions and a small bottom composer maximize the conversation area. |
| `/var/folders/7n/v0vkr6fx777gcbgmqwksgywc0000gn/T/codex-clipboard-3d81833c-5eb5-458c-b5bd-4064e5de62af.png` | Desired keyboard reference | A rounded, multi-line composer remains compact and usable directly above the mobile keyboard. |

## BR-014 — AI Chat information hierarchy consumes the conversation space

Priority: P1

### Actual

The route repeats explanatory and structural chrome (large title/description, suggestion prompts, a Conversation heading and persistence notice, Message label, role labels, and an Enter/Shift+Enter hint). On a phone this makes the primary chat surface visually noisy and leaves a small transcript area.

### Expected

The primary route follows the app theme and navigation while using a minimal chat composition: a compact title, icon-only new-chat action, large transcript area, and small composer. Suggested prompts and desktop-oriented instructional copy are absent. Message direction and visual hierarchy identify speakers without visible role labels.

### Reproduction

1. Open `/chat` on a 390 px-wide phone viewport or Telegram Mini App.
2. Observe the intro copy, suggestion buttons, card heading, field label, keyboard shortcut copy, and labelled bubbles before the conversation can use the screen.

### Acceptance criteria

- No suggested-prompt control, Conversation heading, Message label, or visible Enter/Shift+Enter instruction is rendered.
- The top area has only a compact AI Chat title and an accessible icon-only start-new-chat control.
- The transcript occupies the remaining available vertical space and messages remain visually distinct and accessible.

## BR-015 — AI Chat scrolls persistent controls with the transcript

Priority: P1

### Actual

`AppShell` owns vertical scrolling for `/chat`, so scrolling a long dialogue moves the title, reset action, and composer off screen.

### Expected

Only the transcript timeline scrolls. The compact header, error/retry state when present, and composer stay within the chat layout above the existing primary navigation and Telegram safe area.

### Reproduction

1. Open `/chat` and create enough messages or a visual response to overflow the viewport.
2. Scroll upward in the dialogue.
3. Observe the page header and composer move with the chat content.

### Acceptance criteria

- `/chat` disables AppShell's page-level vertical scrolling without changing other routes.
- The chat timeline is the dedicated vertical scroll surface.
- Header and composer bounding rectangles do not move when the timeline is scrolled.

## BR-016 — AI Chat composer exposes desktop-oriented controls on mobile

Priority: P1

### Actual

The composer is a tall, labelled form with a wordy Send button and visible Shift+Enter shortcut hint. This is not suitable for the phone-first Telegram surface and visually conflicts with the existing compact navigation design.

### Expected

The composer is a compact rounded surface with an accessible placeholder and icon-only send action. It accepts multiline input, preserves the existing desktop keyboard semantics without advertising them on phone, and remains visible above a keyboard-resized viewport.

### Reproduction

1. Open `/chat` on a phone viewport.
2. Focus the message input and inspect the composer before and while the keyboard is present.

### Acceptance criteria

- The input has no visible field label or shortcut hint, while retaining an accessible name.
- Send is icon-only, disabled when the input is blank or a request is pending, and works by touch and keyboard.
- The composer remains in the fixed chat layout when the Telegram/browser viewport shrinks for the keyboard.

## Resolution — verified 2026-07-26

- Removed the oversized card/form layout, introductory and suggested phrases, structural labels, role labels, timestamps, and visible desktop shortcut hint. AI Chat now has a compact title, an accessible plus-only reset control, a transcript-only scroll region, and a rounded icon-send composer.
- Changed AppShell to use `overflow-hidden` only for the normal `/chat` route; the message timeline owns scrolling while the header and composer remain in the fixed chat layout. The composer intentionally bypasses shell focus-position scroll handling so it remains positioned by the keyboard-resized flex layout.
- `AiChatPage` and AppShell unit tests prove the removed chrome, accessible icon controls, composer focus guard, and route-scoped scroll ownership. Phase 4 proves a long dialogue scrolls only its timeline while header/composer rectangles remain stable. Mobile QA proves that behavior plus keyboard resizing, safe areas, and navigation clearance for every dark/light iPhone 12 Pro, iPhone 15, iPhone 15 Pro Max, and iPhone SE profile.
- Verification: frontend lint/typecheck, 19-file/51-test Vitest suite, production build, Phase 4, Phase 5, and the mobile matrix passed. Final visual review used `frontend_new/.codex-tmp/mobile-qa/2026-07-26T19-06-41-722Z/dark/iphone-12-pro/ai-chat.png` and `frontend_new/.codex-tmp/mobile-qa/2026-07-26T19-06-41-722Z/light/iphone-se/ai-chat.png`.
- Remaining exception: no real Telegram device test, because `TELEGRAM_DEVICE_NGROK_DOMAIN` is unset.
