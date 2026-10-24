# OpenAI SDK 3 live-eval lifecycle finding — 2026-10-24

Scope: standalone SMS/category real-LLM tests after upgrading OpenAI 2.48.0 to 3.37.0 and its native HTTPX2 transport. No production-loop failure was observed.

## BR-026 — Cached live-eval client outlives its asyncio event loop

Priority: P2

Evidence: the first selected SMS case passed; the second failed before receiving a model answer with the stack excerpt below. Both are synchronous pytest functions that call `asyncio.run`, while the service client factory is globally cached.

```text
PASSED test_sms_parser_real_llm[wio_usd_with_aed_converted_amount]
FAILED test_sms_parser_real_llm_negative[Your available balance is AED 650.00.]
app/services/sms_parser.py:120 -> client.responses.parse
openai/_base_client.py -> httpx2/_client.py -> httpcore2/_async/http11.py:236
anyio/_backends/_asyncio.py -> asyncio/base_events.py:_check_closed
RuntimeError: Event loop is closed
1 failed, 1 passed, 14 deselected in 4.47s
```

### Actual

The client keeps pooled connections bound to the first test's loop. The next `asyncio.run` creates another loop and the native HTTPX2 request attempts to close a connection associated with the closed earlier loop. The category live-eval file uses the same cached-client/per-test-loop pattern.

### Expected

Each live-eval client remains inside its owning event loop and closes before that loop exits. Repeated standalone cases must not fail because of another test's pooled connection. Product client reuse on the application event loop must remain intact.

### Reproduction

1. Install the updated SDK 3 lockfile and configure the existing OpenAI key.
2. From backend_new, run `RUN_LLM_E2E=1 .venv/bin/pytest --noconftest tests/integration/test_sms_parser_llm_e2e.py -k 'wio_usd_with_aed_converted_amount or (negative and balance)' -v --tb=short -o addopts=`.
3. Observe the first case pass and the second raise `RuntimeError: Event loop is closed`.

### Acceptance criteria

- Both selected cases complete on real SDK 3 HTTPS requests without an event-loop exception.
- SMS and category live-eval clients close inside their creating loop and do not survive into another case.
- The existing unit/type/format/lint checks pass and runtime service behavior remains unchanged.
