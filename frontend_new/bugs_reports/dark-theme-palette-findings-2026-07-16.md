# Dark-theme palette findings — 2026-07-16

Scope: Shared application canvas, header, navigation, cards, inputs, dialogs, and text colors across the shipped React frontend.

## Evidence

| File | Surface | Highlight |
| --- | --- | --- |
| `stitch-dark-theme-reference-2026-07-16.png` | Stitch Transactions reference | The intended dark canvas is a flat near-black navy; cards and controls use coordinated navy surfaces with light foreground text. |
| `frontend_new/src/styles.css` | Shared theme tokens | The app shell currently inherits Telegram theme colors or light fallback colors, which does not guarantee the Stitch dark palette across screens. |

## BR-020 — Shared dark-theme canvas does not match the Stitch reference

Priority: P2

Evidence: `stitch-dark-theme-reference-2026-07-16.png`; user report.

### Actual

The shared app background, foreground, and semantic surface tokens can inherit Telegram or light fallback colors. Individual screens therefore have inconsistent dark canvases and may not match the supplied Stitch reference.

### Expected

All application screens use one dark Money Track palette: a flat navy canvas consistent with the reference, coordinated card/input/modal surfaces, light readable foreground text, and the existing blue primary accent.

### Reproduction

1. Open each primary destination and a nested surface in the dark application theme.
2. Compare the surrounding canvas, shared header/navigation, and semantic card/input/dialog controls with the supplied reference.
3. Observe mismatched or inconsistent background treatment between screens.

### Acceptance criteria

- Transactions, Analytics, AI Chat, Settings, and nested routes share the reference-aligned dark canvas.
- Semantic cards, inputs, dialogs, muted text, borders, and navigation remain readable and consistent on that canvas.
- The primary accent and existing data interactions are unchanged.
