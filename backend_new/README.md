# backend_new

Production Python backend for Money Track.

## Stack

- Python 3.13
- FastAPI + Uvicorn
- Piccolo ORM + PostgreSQL
- Pydantic settings
- Ruff, mypy, pytest

## Quick Start

1. Install dependencies:

```bash
uv sync --group dev
```

2. Run API locally:

```bash
ENVIRONMENT=Development DATABASE_URL=postgresql://postgres:password@127.0.0.1:5432/moneytrack TELEGRAM_BOT_TOKEN=test-token uv run uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

3. Run checks:

```bash
uv run ruff format .
uv run ruff check .
uv run mypy .
uv run pytest -q
```


## Telegram update handling and reply delivery

The webhook acknowledges an update after enqueueing it in memory. The Telegram
library processes this application's queue sequentially by default; incoming
webhook HTTP requests can still overlap or repeat. Do not infer processing order
from Telegram update IDs.

Before handling an update, atomically insert its exact `update_id` into
`telegram_update_receipt`. A primary-key conflict skips all processing and
replies for that duplicate, across workers and restarts. New edit/callback
updates have their own IDs and remain eligible. Keep the existing transaction
upsert on `(user_id, message_id)` as a separate protection for message edits.
The receipt table assumes the single configured bot per database.

Apply migrations before running the updated backend:

```bash
uv run piccolo migrations forwards all
```

The container entrypoint already does this. The new table stores only update IDs
and UTC receipt timestamps, without message payloads. Receipts are deliberately
retained even if processing or reply delivery fails, so redelivery cannot restart
business operations or reset the three-attempt send limit. They record admission,
not successful completion. Do not delete receipts to retry confirmations: this
would rerun the original update.

This is duplicate suppression, not crash recovery. The queue remains in memory:
a restart after webhook ACK can lose pending work, and a crash after claiming an
ID can leave a receipt without completed processing. Automatic recovery would
require durable jobs and resumable processing; it is outside this change.

Outgoing message replies retry `NetworkError` (including `TimedOut`) up to three
attempts total, with one second between attempts and the same text/reply target/
keyboard. `BadRequest`, `Forbidden`, and `RetryAfter` do not use this fixed-delay
retry. Exhausted or permanent delivery errors are logged and never produce a
parse-failure fallback. Unexpected processing exceptions use a distinct
processing-error reply. Reply kind, attempt, and result are logged on the update
trace without logging full SMS or reply text.

If Telegram accepted a send but its response was lost, a transport retry can
produce a duplicate confirmation. Incoming update idempotency does not provide
outgoing message deduplication.


## Decisions API diagnostics

Every category Decisions SDK call emits structured INFO events through the
existing production formatter (`extra={...}`):

- `category_decision_requested`: full SDK request, including model, transaction
  input, historical examples, category choices, and instructions.
- `category_decision_response`: full SDK response before application validation,
  including all answers, probabilities, model, and token/cache usage.
- `category_decision_decoded`: the category, alternatives, and confidence actually
  decoded by the application. Invalid/refused responses instead produce an ERROR
  `category_decision_invalid` event; the full response is still available above.
- `category_decision_failed`: API/transport error type and message, HTTP status,
  response body and OpenAI request ID when available. Connection failures have
  null response/status/request ID.

All events carry `decision_call_id`, endpoint, configured model, and optional
user/transaction IDs. Response/error events include elapsed milliseconds; the
existing formatter adds timestamp, trace ID, and span ID. Search by
`transaction_id` or `decision_call_id` to join input, output and decoded result.
These events describe one logical SDK call including any SDK-managed retries,
not a separate payload log for each underlying HTTP attempt.

Payloads are logged in full at INFO, without truncation, including SMS and
historical financial examples. JSON serialization escapes embedded newlines.
Authentication settings, API keys, and request/response header collections are
never added to the log; only the OpenAI request ID is extracted. Existing token
redaction remains enabled. The production formatter also redacts the configured
OpenAI credential and recognizable OpenAI key patterns after rendering the full
message, structured extras, and traceback, including a key echoed by an API error.
The additional payload volume consumes the existing
Docker log rotation budget sooner; there is no extra permanent log store.
