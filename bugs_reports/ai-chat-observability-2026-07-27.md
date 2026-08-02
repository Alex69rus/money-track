# AI chat incident findings — 2026-07-27

Scope: `POST /api/chat` agent execution and diagnostic logging after a slow, incorrect-data chat answer.

## Evidence

| File | Surface | Highlight |
| --- | --- | --- |
| User-supplied OpenAI trace and container log summary | `POST /api/chat` | An upstream Responses 500 at 16:39:10 UTC was retried; four successful Responses calls completed before the 200 at 16:39:54 UTC. Existing logs cannot correlate the request, user, model calls, retries, or deterministic data supplied to the final answer. |

## BR-017 — Slow or incorrect AI chat answers cannot be diagnosed

Priority: P1

Evidence: user-supplied OpenAI trace and container log summary.

### Actual

The Responses SDK can retry a provider 500 and eventually return a successful `POST /api/chat` response after substantial latency. The application logs neither a request correlation identifier nor the authenticated user, agent model-response identifiers, model-step timings, retry activity, or the deterministic presentation/data snapshot. Consequently, a later incorrect answer cannot be distinguished between stale query data, an incorrect model tool call, or model hallucination.

### Expected

Each AI chat request emits safe, correlatable structured log events that identify the request and user, account for the agent run and individual model/tool steps, and describe the deterministic transaction aggregates and date ranges that produced a presented answer without logging the user message, conversation history, transaction notes, or sensitive raw data.

### Reproduction

1. Send a data-analysis request to `POST /api/chat`.
2. Cause an upstream Responses error that the SDK retries, or inspect a normal multi-step request.
3. Attempt to correlate the HTTP request with individual model calls, retries, and the supplied data/aggregates.
4. Observe that the existing application logs provide no safe request-level evidence to do so.

### Acceptance criteria

- Log a generated correlation ID and authenticated user ID at request start and completion/failure, including total latency.
- Log each model response identifier and model-step duration, with retry count/status when the SDK exposes it.
- Log safe deterministic presentation metadata: analysis type, date range(s), transaction count(s), aggregate values, and selected dimension/counts, without raw dialogue, transaction notes, or credentials.
- Preserve the `POST /api/chat` API response contract and provider-unavailable behavior.
- Add focused automated coverage for the new diagnostics and run relevant backend quality checks.
