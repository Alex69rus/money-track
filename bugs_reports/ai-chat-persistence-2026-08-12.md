# AI Chat findings — 2026-08-12

Scope: Frontend AI Chat (`/chat`); navigation away from the primary destination and Mini App/browser reload.

This report records observed defects only. Do not include a fix unless the user explicitly asks for one.

## Evidence

| File | Surface | Highlight |
| --- | --- | --- |
| `frontend_new/src/pages/AiChatPage.tsx` | `/chat` | The component initializes `messages` from an empty array on mount and keeps the conversation only in React component state. |
| `frontend_new/src/app/App.tsx` | primary-route navigation | The `/chat` route unmounts when another primary destination is selected, so returning to it mounts a new empty chat page. |

## BR-022 — AI Chat conversation disappears after navigation or reload

Priority: P2

Evidence: user feature request; `frontend_new/src/pages/AiChatPage.tsx`; `frontend_new/src/app/App.tsx`.

### Actual

After a user leaves AI Chat for another primary destination and returns, the conversation is empty. Reloading the Mini App/browser also starts an empty conversation.

### Expected

The current completed AI Chat conversation remains available when the user returns to AI Chat or reloads the Mini App, until the user explicitly starts a new chat or the local retention limit is reached.

### Reproduction

1. Open `/chat` and submit a prompt until an AI response is displayed.
2. Open Transactions, Analytics, or Settings with the bottom navigation, then return to AI Chat; alternatively reload the Mini App/browser.
3. Observe that the previously displayed conversation is absent.

### Acceptance criteria

- Completed conversation messages reappear after primary-destination navigation and a Mini App/browser reload.
- The next prompt sends the restored completed dialogue pairs subject to the existing six-pair/12,000-character request bound.
- “Start new chat” clears both the visible conversation and its saved local state.
- Pending requests are never restored as if they completed; unavailable or malformed saved data safely falls back to an empty chat.
