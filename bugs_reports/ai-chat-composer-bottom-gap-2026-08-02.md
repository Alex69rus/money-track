# AI Chat composer findings — 2026-08-02

Scope: AI Chat in the iOS Telegram Mini App during a live conversation with a chart response.

This report records observed defects only.

## Evidence

| File | Surface | Highlight |
| --- | --- | --- |
| `ai-chat-composer-bottom-gap-2026-08-02.jpg` | Telegram iPhone AI Chat | The composer is separated from the persistent bottom navigation by a large empty area while the transcript is scrolled. |
| `ai-chat-composer-flush-nav-2026-08-02.jpg` | Telegram iPhone AI Chat | The correction overcompensates: the composer is flush against the navigation border with no visual breathing room. |

## BR-019 — AI Chat composer leaves a bottom gap

Priority: P2

Evidence: `ai-chat-composer-bottom-gap-2026-08-02.jpg`, `ai-chat-composer-flush-nav-2026-08-02.jpg`; user smoke-test report.

### Actual

The composer has rendered at both incorrect extremes: substantially above the bottom navigation after a long response, and flush against the navigation border after the initial correction.

### Expected

The composer remains fixed at the bottom of the available chat area with the product’s normal visual gutter above persistent navigation, while only the timeline scrolls.

### Reproduction

1. Open AI Chat in the Telegram iOS client.
2. Send a request that produces a long answer and chart.
3. Scroll the conversation to the answer and chart.
4. Observe the space between the composer and the persistent bottom navigation.

### Acceptance criteria

- On a primary AI Chat screen with the keyboard closed, the composer has a small, consistent visual gutter above the persistent navigation; it is neither flush nor separated by a large blank area.
- Scrolling a long timeline does not change the composer’s position.
- The composer stays reachable above the keyboard and the bottom navigation behavior remains unchanged on non-chat primary pages.
- Browser QA proves the exact standard `1rem` product gutter (within a 2px rendering tolerance) in both full-height and normal-host Telegram viewport states, and retains a screenshot plus measured-layout artifact for each phone profile.
