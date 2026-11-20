# BR-028 — Telegram fallback investigation

Initial investigation: **Triaged — cause confirmed**.

Update: The fix was implemented locally in this worktree. See `telegram-create-reply-failure-2026-11-02-delivery.md`. Production was unchanged. Line references below point to the original commit `07c203e`.

Verified on 2026-11-02 through read-only SSH access to production, without sending Telegram messages or calling OpenAI.

## Finding

The SMS was processed and saved. A TLS error during confirmation delivery reached the general exception handler, which sent `Cannot parse the transaction`. That reply incorrectly reported a parse failure after a successful save.

## Evidence reviewed

- Screenshot: `telegram-create-reply-failure-2026-11-02.jpg`.
- Raw report: `telegram-create-reply-failure-2026-11-02.md`.
- Production logs from 11:20:13–11:20:27 UTC and file SHA-256 hashes: `telegram-create-reply-failure-2026-11-02-runtime.txt`.
- Running container: `money-track-backend-1`, image ID `sha256:c6e49a298e53c799d3026008f1ff15459abb8d4de55879dc872c87065ef13416`, StartedAt `2026-10-28T05:38:47.192833615Z`.
- Server checkout HEAD: `07c203ea55309761ebc48d0a9bf27531ba2fcea6`. The checkout alone cannot establish the contents of the `backend:latest` image.
- The deployed handler and runtime files were read directly from the running container. The SHA-256 hashes for `telegram_ingestion.py`, `telegram_runtime.py`, `telegram_router.py`, and `queries.py` matched the local files in `backend_new/app/`.

## 1. Parsing and transaction ID 3400

In `telegram_ingestion.py:173–204`, the parser must return a non-null result containing the amount and currency. Otherwise, the handler calls `_send_unparsed` before upsert and returns. On success, `upsert_transaction_by_message_id` returns a DTO with the database ID for category suggestion.

In `queries.py:491–589`, the upsert uses `(user_id, message_id)` and returns the existing or new row ID. A category suggestion alone cannot establish that a new row was inserted.

A read-only production PostgreSQL check confirmed all six conditions:

| Check for record ID 3400 | Result |
| --- | --- |
| Exactly one row exists | true |
| `sms_text` exactly matches the SMS from the report | true |
| `amount=-49.31` and `currency=AED` | true |
| `category_id=50` | true |
| `created_at` is within [2026-11-02 11:20:13Z, 11:20:24Z) | true |
| `message_id` is populated | true |

The financial record contents, user ID, and message ID were kept in the database. Automatic approval review rejected a full-row read and allowed the boolean comparisons. The unique production index `ix_transaction_user_id_message_id` on `(user_id, message_id)` was also verified.

## 2. Why a parse-failure reply follows a successful save

In lines 135–149, `_send_create_reply` builds `Transaction was saved.`, the transaction details, and the category buttons. Line 143 calls `bot.send_message`.

In lines 293–312, `handle_telegram_update` wraps the entire `_handle_message_update` call in `except Exception`. An exception from sendMessage is logged as `Failed to process Telegram update`, then the handler calls `_send_unparsed` for the original chat and message. In lines 76–81, `_send_unparsed` always sends `UNPARSED_REPLY_TEXT = "Cannot parse the transaction"`.

The Telegram call follows the upsert and category assignment. No database transaction spans reply delivery, so a delivery failure leaves the saved transaction in place while the user sees an incorrect reply.

## 3. Correlating the 11:20:24 and 11:20:25 sends

Production logs for 2026-11-02:

| UTC | Event |
| --- | --- |
| 11:20:13.664 | Processing started for `update_id=490336313` |
| 11:20:20.782 | Category suggestion for `transaction_id=3400` |
| 11:20:23.461 | Category 50 applied |
| 11:20:24.615 | `NetworkError: httpx.ConnectError` from `_send_create_reply:143`, with the transport failing in `stream.start_tls` |
| 11:20:25.581 | The next Telegram sendMessage received HTTP 200 |

Categorization, the exception, and the successful send share trace ID `5325112bbf8206c8054262884365ae83`. The exception and successful send also share span ID `bc24e7bac9a19d4a`.

The successful send came from the exception handler's fallback. The handler does not retry the confirmation, rerun the parser or upsert, or requeue the update. A failure to send the fallback only logs `Failed to send fallback Telegram reply`.

The historical logs lack the successful Telegram request and response bodies. The running code, traceback, shared trace and span IDs, and screenshot identify the fallback text. The empty `ConnectError` does not identify whether the TLS failure came from the network, the remote endpoint, or another transport issue.

## 4. Idempotency and webhook acknowledgment

- In `telegram_router.py:71–72`, the webhook places the update in the in-memory `application.update_queue` and immediately returns HTTP 200. This acknowledges queue admission. Business processing and reply delivery still happen afterward.
- The original webhook and handler use `update_id` for logging and have no processed-update store or duplicate check.
- The database upsert on `(user_id, message_id)` prevents a second row for the same key. Reprocessing can still rerun parsing and category suggestion, update fields, and send another reply. For an ordinary duplicate message, `_resolve_suggestion` repeats categorization. The branch that retains an existing category applies to edited messages.
- The available logs show one processing start and one webhook admission for `update_id=490336313`. A single update accounts for the observed behavior.
- The webhook's HTTP 200 at 11:20:13 UTC is consistent with background processing through 11:20:25. That is 15:20 in UTC+4.

## 5. Local reproduction

The historical probe explicitly loads the handler from commit `07c203e` regardless of the fixed checkout. Run from the repository root with the backend's Python dependencies installed:

```sh
backend_new/.venv/bin/python bugs_reports/telegram-create-reply-failure-2026-11-02-repro.py
```

Result: **reproduced**, and assertions passed. The parser, upsert, categorization, and Telegram are mocked. The callback signer uses a synthetic secret. The probe makes no external API or database calls.

Artifact: `telegram-create-reply-failure-2026-11-02-repro-result.json`.

- Parsing, upsert, and categorization each run exactly once.
- The first send contains `Transaction was saved.` and raises a synthetic `NetworkError`.
- The second send contains exactly `Cannot parse the transaction`.
- Both replies target the same message ID.

The probe reproduces the original defect. The first attempt stopped before the transport because callback signing needed settings. It reproduced successfully after those settings were mocked locally.

## Scope of the original investigation and proposed fix

The investigation left application code and production unchanged. The proposed fix separates parser, storage, and category errors from confirmation delivery errors. Once a transaction is saved, a confirmation delivery failure must never send a parse-failure reply. Log the reply type, update ID, transaction ID, and delivery outcome without the full SMS. Add a regression test for a failed confirmation after a successful save. Safe retries and durable update deduplication were separate decisions beyond the original investigation.
