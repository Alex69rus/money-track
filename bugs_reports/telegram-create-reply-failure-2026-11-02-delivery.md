# BR-028 — Local fix, 2026-11-02

Status: **Fixed — verification pending**. Local checks for the changed behavior passed. Production and a real Telegram client were outside the verification scope. The full backend suite also reproduced the three baseline failures listed below.

## Changed behavior

- The new `telegram_update_receipt` stores the exact update ID and receipt time in UTC. An atomic `INSERT ON CONFLICT DO NOTHING` before business processing admits each ID once, including callbacks. Receipts persist across restarts and support out-of-order IDs. An edited message with a new update ID still updates the transaction using the original message ID.
- `send_telegram_reply` retries the same text, reply target, and keyboard after `NetworkError` or `TimedOut`. It makes at most three attempts with a one-second delay between attempts. Parsing, upsert, and categorization run once.
- `BadRequest` (a subclass of `NetworkError`), `Forbidden`, and `RetryAfter` are logged as terminal delivery failures without the fixed-delay retry.
- Delivery failures bypass the parse-failure reply. Unexpected processing failures have a dedicated response. An actual parse failure still returns `Cannot parse the transaction`.
- Logs record the reply type, attempt number, and result without the full SMS or reply body. A trace correlates them with update processing.

The changes are under `backend_new`: `app/services/telegram_ingestion.py`, the new `telegram_delivery.py` and `telegram_updates.py` services, the `TelegramUpdateReceipt` model and registration, migration `db_2026_11_02t12_00_00_000001.py`, unit and integration tests, and the README and guardrails.

## Checks

Commands ran from `backend_new`. The existing Python and tools in `backend_new/.venv/bin/` avoided a known `uv` sandbox panic. Application and test imports resolved from the worktree. Installed versions were openai-agents 0.24.0, openai 3.37.0, and Piccolo 1.32.0. The checks made no external LLM or Telegram calls.

- Before implementation, the new regressions had 9 failures and 1 pass, confirming missing retries and duplicate suppression, plus the incorrect fallback.
- `python -m ruff format .` and `python -m ruff check .` passed.
- `python -m mypy .` passed across 74 source files.
- `python -m pytest tests/test_telegram_ingestion.py -q --tb=short` passed all 19 tests after implementation.
- `DATABASE_URL=postgresql://postgres:password@127.0.0.1:5432/moneytrack TELEGRAM_BOT_TOKEN=test-token piccolo migrations forwards all` applied the migration to the local database.
- PostgreSQL integration checks confirmed that eight concurrent claims for one ID produce exactly one winner, a duplicate is rejected from a new event loop, a new lower ID is accepted, and negative fixture IDs are removed in `finally`.
- The first full run had 150 passes, 2 skips, and 4 failures. The new database test exposed a timezone mismatch. Piccolo `Timestamp` expects a naive datetime, so the implementation now uses explicit naive UTC. All three remaining AI Chat failures reproduced on a clean copy of baseline `07c203ea55309761ebc48d0a9bf27531ba2fcea6`.
- The second full run, excluding those three baseline failures, had **151 passes, 2 skips, and 3 deselections**. Both skips require `PRODUCTION_BASE_URL`. The Telegram regression tests ran again after the final fixture adjustment.

The readiness runner set `BASE_URL=http://127.0.0.1:65028` for this command:

```sh
python -m pytest tests -ra \
  --ignore=tests/integration/test_sms_parser_llm_e2e.py \
  --ignore=tests/integration/test_category_suggestion_llm_e2e.py \
  --ignore=tests/integration/test_telegram_category_suggestion_e2e.py \
  -k 'not test_aggregate_tool_rejects_invalid_top_level_pagination and not test_list_transactions_rejects_invalid_top_level_pagination and not test_tags_tool_rejects_invalid_top_level_pagination'
```

Set both `DATABASE_URL` and `TEST_DATABASE_URL` to `postgresql://postgres:password@127.0.0.1:5432/moneytrack`. Set `TELEGRAM_BOT_TOKEN=test-token` and `RUN_LLM_E2E=0`. Leave `TELEGRAM_WEBHOOK_URL`, `TELEGRAM_WEBHOOK_SECRET`, and `OPENAI_API_KEY` empty. The runner started uvicorn from the worktree, waited for `GET /health` to return HTTP 200, and stopped its own process after pytest. An existing process on port 8000 stayed running.

Baseline failures:

- `test_ai_chat_aggregate_tool.py::test_aggregate_tool_rejects_invalid_top_level_pagination`
- `test_ai_chat_select_tool.py::test_list_transactions_rejects_invalid_top_level_pagination`
- `test_ai_chat_tags_tool.py::test_tags_tool_rejects_invalid_top_level_pagination`

The SDK returns a generic tool error while those assertions expect `take` or `skip`. The same contract mismatch exists on the baseline. The full suite still requires these exclusions to pass.

The historical probe at `telegram-create-reply-failure-2026-11-02-repro.py` was verified again. It loads the old handler with `git show` and demonstrates the original defect without network or database calls. `tests/test_telegram_ingestion.py` verifies current behavior.

## Operational limits

- Apply the Piccolo migration before starting the new version. The existing Docker entrypoint already runs `migrations forwards all`. This work applied the migration locally.
- A receipt records admission to processing. Receipts persist after errors so redelivery cannot repeat side effects or reset the delivery attempt budget. The implementation adds no receipt states, replay, or deletion.
- The webhook still acknowledges updates before downstream processing and queues them in memory. A crash after acknowledgment can lose queued work. A crash after claiming an ID can leave processing incomplete. The receipt provides at-most-once admission.
- If Telegram accepts a message and its response is lost, a retry can send a duplicate confirmation. The incoming receipt does not provide exactly-once delivery.
- The table assumes one configured bot per database.

Before production verification, resolve the baseline CI failures and verify the scenario with a real Telegram client after deployment.
