# SMS parser findings — 2026-08-27

Scope: Production Telegram bot SMS-ingestion flow; Wio Personal card payment alerts.

This report records observed defects only. Do not include a fix unless the user explicitly asks for one.

## Evidence

| File | Surface | Highlight |
| --- | --- | --- |
| User report (2026-08-27) | Production Telegram bot | Six or more persistent Wio payment SMS parsing failures; the LLM returns an empty result. |
| Local live synthetic probe (2026-08-27) | OpenAI Responses API / `gpt-4.1-mini-2025-04-14` | The existing Decimal-based structured schema returns `status: incomplete`, `reason: max_output_tokens`, and zero output tokens for a Wio-shaped test message. |
| Local synthetic control (2026-08-27) | OpenAI Responses API | Plain text and a simplified nullable-float schema complete successfully with the same model and message shape. |

## BR-024 — Wio card payment SMS is rejected as unparseable

Priority: P1

Evidence: User report (2026-08-27); production symptom reported as persistent across 6+ cases.

### Actual

For the supplied Wio payment alert, the LLM parser returns an empty result and the bot does not create a transaction.

The local reproduction confirms the same failure for the repository's existing synthetic Wio alert. The API returns an empty output body with an `incomplete` response status; the SDK then raises a JSON-validation error before the application receives a parsed object.

### Expected

The bot recognizes the payment as an expense and creates a transaction with amount `-44.96`, currency `AED`, and merchant `Katrina Sweet Confectionery`.

### Reproduction

1. Send the following text through the SMS parser: `Payment of AED 44.96 was done at Katrina Sweet Confectionery using your Wio Personal card 9759 with Credit money.`
2. Observe the parser response.
3. The production flow reports an empty parse and rejects the transaction.

### Acceptance criteria

- The supplied SMS consistently produces a non-empty transaction with amount `-44.96` and currency `AED`.
- The extracted note identifies `Katrina Sweet Confectionery`.
- Clearly non-transaction messages remain rejected.
- Valid existing Wio, multi-currency, grouped-amount, debit, and credit SMS parsing behavior does not regress.

### Investigation notes — 2026-08-27

- The live failure persists with explicit output limits of both 128 and 1024 tokens, so the API's `max_output_tokens` reason is not remedied by setting a small explicit limit.
- The configured model can complete ordinary text requests, and it completes the same SMS prompt when the structured `amount` field is a nullable float instead of the current nullable Decimal (`number | string-pattern | null`) schema.
- The response model is the fixed `gpt-4.1-mini-2025-04-14` snapshot. The repository parser and locked OpenAI SDK predate this report; the observed trigger is therefore consistent with an upstream structured-output behavior regression or compatibility change.

### Candidate mitigation evaluation — 2026-08-27

- The SMS parser now hardcodes `gpt-5.6-luna` with medium reasoning. Category suggestion independently hardcodes the same model with high reasoning. Neither prompt was changed.
- Both reasoning objects request `summary: "auto"`, so stored Responses can include reasoning summaries in the OpenAI platform. A synthetic parser check confirmed the setting is stored; its trivial request used zero reasoning tokens, so it correctly produced no reasoning item.
- The parser retains `Decimal` in its single structured-output/domain model. Its amount field uses a numeric JSON-schema annotation, so Luna receives `number | null` rather than Pydantic's unsupported nullable decimal-string regex schema; no amount string conversion is performed after parsing.
- A live Wio-shaped synthetic check through the updated parser returned `-44.96` AED and the expected merchant name. The existing live-LLM SMS corpus passed amount/currency for all seven positive cases and rejected both negatives; one CBD loan case missed the existing note-similarity threshold by returning only `LMF*****3355` or `loan installment` rather than `loan installment for LMF*****3355`. No loan-specific prompt rule was added to mask that gap.
- Category evaluation: the unchanged prompt scored 5/5 on the fixed synthetic category corpus for both `gpt-4.1-mini-2025-04-14` and Luna/high; the real Telegram/category integration test passed with Luna.
- Verification: `uv run ruff check .` — passed; `uv run mypy .` — passed; focused unit tests — passed; readiness-checked full suite excluding separately evaluated real-LLM tests — passed with two expected skips. This candidate has not been deployed to production.
