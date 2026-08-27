# AI Chat findings — 2026-08-27

Scope: AI Chat model migration from `gpt-5-mini` to `gpt-5.6-luna`, exercised locally with synthetic, namespaced transactions.

## Evidence

| File / command | Surface | Highlight |
| --- | --- | --- |
| `UV_CACHE_DIR=./.uv-cache uv run python /private/tmp/money-track-ai-chat-model-eval.py` | Live AI Chat tool-call setup | `gpt-5-mini` completed two grounded cases; Luna rejected the request with HTTP 400 before any tool call. |

## BR-025 — Luna rejects AI Chat transaction-filter tool schema

Priority: P1

Evidence: live synthetic model evaluation on 2026-08-27; OpenAI returned `Invalid JSON schema: regex lookaround is not supported` at `TransactionFilter.min_amount`.

### Actual

With Luna selected, every AI Chat request is rejected before model execution because the generated JSON Schema for `Decimal` transaction filter fields contains a regex lookaround unsupported by the model endpoint.

### Expected

AI Chat requests using transaction read tools work with Luna while retaining exact decimal validation for amount filters.

### Reproduction

1. Select `gpt-5.6-luna` for `ChatAgent` with the existing read tools.
2. Send a factual question that requires `list_transactions` or `aggregate_transactions`.
3. Observe HTTP 400: `Invalid JSON schema: regex lookaround is not supported`.

### Acceptance criteria

- The AI Chat tool schemas contain no regex lookaround unsupported by Luna.
- `min_amount` and `max_amount` retain runtime decimal parsing and range validation.
- The live synthetic balance and table scenarios complete successfully with Luna.
