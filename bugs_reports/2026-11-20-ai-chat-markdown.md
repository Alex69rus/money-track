# AI Chat shows markup in reply text

## BR-031 — Asterisks around emphasized text in an AI Chat reply

Priority: P3. State: Triaged.

The screenshot `2026-11-20-ai-chat-markdown.png` shows the formatting after the fix, using test data in iPhone 12 Pro browser emulation.

### Actual behavior

When the assistant returns text containing `**…**`, the reply displays the asterisks. The component at `frontend_new/src/pages/AiChatPage.tsx` renders the text directly in a paragraph and preserves line breaks.

### Expected behavior

Emphasis appears as part of the reply without visible markup. The AI Chat PRD describes text replies and widgets, and the frontend PRD describes the message feed. Neither explicitly specifies Markdown support.

### Reproduction

Open AI Chat in the Telegram Mini App. Get an assistant reply containing `**text**` and inspect how it displays emphasis.

### Acceptance criteria for Markdown support

- An assistant reply containing `**text**` displays the text in bold without asterisks.
- Replies preserve paragraphs and display the widgets attached to them.
- Text and amounts following a standalone `<Transport>` line stay visible. HTML creates no elements in the reply.
- If a Markdown link label contains bold, italic, or inline code, the visible label renders as plain text.
