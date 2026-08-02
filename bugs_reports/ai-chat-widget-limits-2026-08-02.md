# AI Chat widget-limit findings — 2026-08-02

Scope: AI Chat widget tool contracts and phone chart rendering.

## Evidence

| File | Surface | Highlight |
| --- | --- | --- |
| `ai-chat-widget-point-limits-2026-08-02.jpg` | Telegram AI Chat | A 24-month request is declined solely because the line widget accepts at most 12 points, while the assistant incorrectly offers a full 24-row table despite that widget's 20-row cap. |

## BR-018 — AI Chat chart limits block usable requested periods

Priority: P2

Evidence: `ai-chat-widget-point-limits-2026-08-02.jpg`; user report.

### Actual

Line widgets reject more than 12 points and bar widgets reject more than 10. The table tool's description does not tell the model about its 20-row limit, allowing it to promise an invalid 24-row table.

### Expected

Line charts can show every retrieved period point without horizontal page or chart scrolling. Bars can show 20 retrieved items in a horizontally scrollable region within the card, while the page remains fixed to the viewport. The table tool description states its row limit.

### Reproduction

1. Open AI Chat.
2. Ask for a monthly line chart across 2025–2026.
3. Observe the assistant decline the 24-point chart and offer an unsupported 24-row table.

### Acceptance criteria

- A 24-point line widget is accepted by backend and frontend contracts and renders without a horizontal scroll container.
- A 20-item bar widget is accepted and scrolls horizontally inside its visual card without causing page-level horizontal overflow at 390×844 DPR 3.
- The table tool description states that it accepts at most 20 rows.
- Unit and browser/mobile checks cover the extended data shapes, tooltip facts, and fixed chat controls.
