# Native date-control findings — 2026-07-12

Scope: `frontend_new` Transactions and Analytics date fields in a Telegram Mini App flow.

This report records observed defects only. Do not include a fix unless the user explicitly asks for one.

## Evidence

| File | Surface | Highlight |
| --- | --- | --- |
| User report, pending issue 5 | Transactions / Analytics datepicker | Opening a datepicker scrolls far from its field and reset does not work. |
| `src/hooks/useFocusedInputPosition.ts` | Shared app scroll container | Every input, including native date input, is repositioned on focus and after viewport changes. |
| `src/components/ui/native-date-field.tsx` | Shared date control | The native input owns the whole touch surface; there is no app-owned clear action. |

## BR-007 — Native datepicker moves the page and lacks a reliable reset

Priority: P2

Evidence: user report; source observations above.

### Actual

Opening a native datepicker can invoke the shared keyboard-focus scroll behavior and move the app far from the originating date field. Reset depends on the host picker despite the app-rendered date surface having no explicit, independently reachable clear action.

### Expected

Opening a native datepicker keeps the current app scroll position. A visible app-owned clear action resets only its associated date value and updates the rendered field immediately.

### Reproduction

1. Open Transactions filters or Analytics in Telegram.
2. Tap a date field.
3. Observe the app scroll move before or while the native picker opens.
4. Attempt to reset the date and observe the control does not provide a reliable in-app reset path.

### Acceptance criteria

- Date inputs do not activate keyboard-focus repositioning; text/date-time editor fields retain their existing focus behavior.
- Each populated date field exposes an accessible clear action above the transparent native picker overlay.
- Clearing one date does not change its companion date value.
- Transactions and Analytics test date clearing and rendered-value updates; phone QA covers date-picker scroll stability.
