# Telegram ingestion findings — 2026-11-02

Scope: investigation of a production Telegram response; incident date independently established as 2026-11-02 by production logs.

## Evidence

| File / source | Surface | Highlight |
| --- | --- | --- |
| `telegram-create-reply-failure-2026-11-02.jpg` | Telegram | Bank SMS and reply “Cannot parse the transaction”, both at 15:20. |
| `telegram-create-reply-failure-2026-11-02-runtime.txt` and user-supplied runtime log summary | Backend | update_id=490336313; trace_id=5325112bbf8206c8054262884365ae83; transaction_id=3400; category_id=50. |

## BR-028 — Saved payment receives a parse-failure reply

Priority: P1

### Actual

User sent: `Payment of AED 49.31 was done at Amazon grocery using your Wio Personal card 9759 with Credit money`.
Screenshot is authoritative evidence that the bot replied `Cannot parse the transaction` at 15:20.

Reported runtime sequence (UTC):
- 11:20:13 webhook accepted update_id=490336313 and returned HTTP 200.
- 11:20:20 OpenAI /v1/responses returned HTTP 200.
- 11:20:20–23 category suggestion reached transaction_id=3400 and applied category 50.
- 11:20:24 create-reply sendMessage failed with httpx.ConnectError during TLS; stack: handle_telegram_update → _handle_message_update:206 → _send_create_reply:143 → bot.send_message.
- 11:20:25 another Telegram sendMessage returned HTTP 200; response text is absent from the logs supplied.

15:20 UTC+4 corresponds to 11:20 UTC; time alone does not establish event identity. OpenAI HTTP 200 and category suggestion alone do not establish the Telegram reply text.

### Expected

The bot reports the saved transaction accurately. A confirmation-delivery failure must not be reported as a parsing failure.

### Reproduction

1. Send a valid payment SMS.
2. Allow transaction upsert and category assignment to succeed.
3. Fail the first Telegram confirmation send with a connection error.
4. Inspect the subsequent outbound reply and persisted transaction.

### Acceptance criteria

- Establish the deployed handler branch that can send the observed reply after persistence.
- Distinguish confirmation retry, fallback, and duplicate update processing.
- Document update/message idempotency and the limits of historical correlation.
- A future fix must prevent a confirmation-delivery error from generating a parse-failure reply.

### Approved implementation — 2026-11-02

- Reject duplicate update_id before business processing; store exact IDs durably.
- Retry transient reply-send failures with one-second pauses, three attempts total. Reuse the original payload.
- Exhaustion must not send parse-failure or repeat parsing/persistence/category actions.
- Edits with distinct update IDs continue to update the same message transaction.
