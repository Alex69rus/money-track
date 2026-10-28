# backend_new Guardrails Log

This file stores reusable guardrails from implementation/debugging loops to reduce repeated mistakes and token waste.

## Update Rule

After each implementation/debugging iteration, append concise notes with:
- Takeaways: pitfalls, root causes, and preferred fixes.
- Explorations: what was checked, what was ruled out, and why.
- Prevention rule: one concrete default command/check to avoid recurrence.

Keep entries short, actionable, and repository-specific.

## Active Guardrails

### 2026-02-18 - Integration Execution Reliability
- Takeaway: fixed sleeps before tests are flaky; startup timing must be validated explicitly.
- Preferred fix: always poll `GET /health` with timeout before integration runs.
- Prevention rule: classify failures first (`connectivity | sandbox | auth | contract`) before changing code.

### 2026-02-18 - Runtime Lifecycle
- Takeaway: DB connection pooling belongs in FastAPI lifespan, not per-request setup.
- Preferred fix: manage startup/shutdown pool lifecycle centrally.
- Prevention rule: keep one canonical engine factory shared by runtime and Piccolo config.

### 2026-02-19 - API Contract Safety
- Takeaway: framework defaults can drift from expected API error payloads.
- Preferred fix: use explicit exception handlers for stable error shapes.
- Prevention rule: lock response shape expectations with integration tests for each route group.

### 2026-02-19 - ORM Boundary Discipline
- Takeaway: mixing DB access patterns creates drift and maintenance risk.
- Preferred fix: keep runtime CRUD/query paths on Piccolo ORM only.
- Prevention rule: reject non-Piccolo DB calls and dynamically constructed or unparameterized runtime SQL. Use fixed, parameterized `Entity.raw()` only when Piccolo cannot express a required PostgreSQL operation.

### 2026-02-19 - Typed Contracts
- Takeaway: loose runtime shapes increase hidden regressions.
- Preferred fix: route DB outputs through typed schema models and typed service contracts.
- Prevention rule: avoid `Any` in runtime service/query paths.

### 2026-02-19 - DB-Side Filtering
- Takeaway: Python-side filtering after load harms performance and parity.
- Preferred fix: attach all filters and pagination to DB queries before execution.
- Prevention rule: reject endpoint implementations that load-all then filter in Python.

### 2026-02-21 - Data Integrity Verification
- Takeaway: behavior tests alone can miss schema drift.
- Preferred fix: pair behavioral assertions with schema/catalog checks for critical constraints.
- Prevention rule: for each DB invariant, keep one behavior test and one schema-level assertion.

### 2026-02-22 - Paginated Count Efficiency
- Takeaway: `len(query.run())` for total counts is inefficient.
- Preferred fix: use DB aggregate count query with identical predicates.
- Prevention rule: enforce aggregate-count pattern for paginated endpoints.

### 2026-03-07 - Local-Day Date Filtering
- Takeaway: date filters must use business-local calendar boundaries.
- Preferred fix: compute local-day boundaries in `BUSINESS_TIMEZONE` and convert to UTC for predicates.
- Prevention rule: keep an integration test for local-day boundary exclusion.

### 2026-03-07 - Gate Command Reliability
- Takeaway: ad-hoc integration commands can produce false negatives.
- Preferred fix: use orchestrated service startup + readiness + test execution commands.
- Prevention rule: declare parity/status only from controlled test runs with explicit URLs and lifecycle handling.

### 2026-03-22 - Telegram Runtime Test Boot Guard
- Takeaway: local test boot fails when `.env` enables `TELEGRAM_WEBHOOK_URL` and startup uses a dummy bot token.
- Exploration: ruled out API regressions after reproducing `InvalidToken` during lifespan startup and confirming tests pass when webhook env is cleared.
- Prevention rule: for local integration/full test orchestration, always set `TELEGRAM_WEBHOOK_URL=` and `TELEGRAM_WEBHOOK_SECRET=` with explicit `ENVIRONMENT=Development`.
- For manual Telegram/SMS checks, preserve the real webhook URL and secret from `.env` and use `ENVIRONMENT=Production` so Mini App authentication and ingested SMS share the real Telegram user ID; never reuse the isolated-test overrides above.

### 2026-03-22 - Sandbox-Safe E2E Execution
- Takeaway: sandboxed `uv` runs can panic or fail with cache/system permission errors, causing false infrastructure failures.
- Exploration: ruled out app defects by rerunning the same orchestration with `UV_CACHE_DIR=./.uv-cache` and escalated execution; tests then passed.
- Prevention rule: default to orchestrated runs with `UV_CACHE_DIR=./.uv-cache`; escalate only when failure class is `sandbox/permission`.

### 2026-04-03 - Async Loop Consistency in Piccolo E2E
- Takeaway: running Piccolo pool operations across multiple `asyncio.run(...)` calls causes cross-loop failures (`Future attached to a different loop` / `another operation is in progress`).
- Exploration: ruled out query logic by reproducing failures only when pool start/query/close spanned different event loops; stable behavior returned after executing the full scenario in one coroutine.
- Prevention rule: when tests use `engine.start_connection_pool()`, run setup, business calls, and teardown in a single async coroutine with one `asyncio.run(...)` entrypoint.

### 2026-07-17 - Filter Variable Safety
- Takeaway: introducing a new filter parameter can accidentally be shadowed by an existing loop variable, silently composing an unintended second predicate.
- Exploration: multi-tag list requests retained only the last tag; focused API tests isolated the cause to `tag` being reused as a loop variable before applying the singular tag filter.
- Prevention rule: use distinct names for request filters and normalized loop values, and cover combined filter paths with integration tests.

### 2026-07-18 - Database-side Analytics Aggregation
- Takeaway: moving an aggregate from the frontend to Python only relocates the unbounded memory and latency cost.
- Exploration: static parameterized PostgreSQL queries correctly covered AED/user/date filtering, category/tag shares, Dubai-local month buckets, and tag extraction; the isolated parity suite passed 34 tests with 2 production-only skips.
- Prevention rule: reject any aggregate resource that loads matching transaction rows for Python reduction, grouping, share calculation, or ordering; return only database aggregate projections.

### 2026-07-18 - Bootstrap Catalog Seeds
- Takeaway: production identity values cannot be reused when seeding a fresh database with hierarchical catalog data.
- Preferred fix: seed root rows first, then resolve child `parent_category_id` values by the parent's stable unique name.
- Prevention rule: use idempotent `ON CONFLICT (name) DO NOTHING` catalog inserts in the initial migration and preserve the production type and ordering values.

### 2026-07-19 - Canonical Category Presentation
- Takeaway: shared category colors and Material Symbol names belong in the database catalog, not in per-client mappings.
- Exploration: an idempotent migration updated all 50 seeded categories by stable `(name, type)` and the category API exposed the values unchanged.
- Prevention rule: add every predefined category's icon and validated `#RRGGBB` color to the catalog migration and cover the API response in integration tests.

### 2026-07-25 - Zed FastAPI launcher
- Takeaway: this FastAPI service must launch the `uvicorn` module from `backend_new`; a Django-style `main.py runserver` profile cannot start it.
- Exploration: `python -m uvicorn app.main:app` returned `OK` from `/health`; the inherited `uvicorn` console script was ruled out because its interpreter path is stale after a moved checkout.
- Prevention rule: configure Zed Debugpy with `module: "uvicorn"` and `cwd: "$ZED_WORKTREE_ROOT/backend_new"`; recreate `.venv` before relying on console-script executables.

### 2026-07-25 - AI Chat Transaction Pagination
- Takeaway: pair a paginated data query with a matching database-side count query and deterministic ordering.
- Exploration: the focused AI-chat tool suite passed after applying the same predicates to `COUNT(*)` and adding `OFFSET` / `LIMIT` before execution.
- Prevention rule: every new raw paginated transaction query must return its requested page, unpaged total, and `has_more` from one shared predicate fragment.

### 2026-07-26 - Array Tag Filtering
- Takeaway: a PostgreSQL `SELECT` alias is not available to a `WHERE` predicate in the same query level.
- Exploration: case-insensitive tag filtering failed with `column "tag" does not exist`; default retrieval and pagination ruled out array storage and ordering defects.
- Prevention rule: expand tag arrays with `CROSS JOIN LATERAL UNNEST(...) AS alias(tag)` and reference `alias.tag` for all filter predicates.

### 2026-07-26 - AI Chat Aggregate Parameter Order
- Takeaway: raw-query argument order follows placeholder position in the complete SQL string, not query-construction order.
- Exploration: business-timezone grouping placed its placeholder before the nested user-scope predicate, so a user ID was bound where PostgreSQL expected a timezone string.
- Prevention rule: build raw SQL parameter lists in textual placeholder order and keep a local-time boundary integration test for every date-grouping query.

### 2026-07-26 - AI Chat Structured Tool Output
- Takeaway: ordinary Pydantic models and lists are stringified before the Agents SDK returns them to the model.
- Exploration: aggregate output reached the model as `TransactionAggregationResult(... Decimal(...))`; `ToolOutputText` preserved model-generated JSON as text instead.
- Prevention rule: return validated JSON text from read tools; widget tools must store the response visual and return only a short acknowledgement, with their data excluded from model-facing tool output.

### 2026-08-02 - AI Chat Data-First Widget Boundary
- Takeaway: keep authenticated retrieval and widget preparation separate; the agent writes text after read tools return data.
- Exploration: four schema-only widget tools captured one request-local visual while the scoped aggregate, transaction, and tag tools continued to pass their integration suite.
- Prevention rule: every AI Chat widget tool must accept only typed display data, perform no query, identity, or filter work, return a short non-data acknowledgement, and reject a second visual for the same response.

### 2026-07-26 - AI Chat Negative-Expense Ranking
- Takeaway: sort negative expense aggregates by absolute value before applying a top-N visual cap.
- Exploration: descending raw sums put `-10` before `-100`; absolute-value SQL ordering preserved the largest displayed expenses and the comparison candidates.
- Prevention rule: any user-visible expense ranking must test unequal negative magnitudes and assert the largest displayed amount appears first.

### 2026-08-02 - AI Chat Analysis Defaults
- Takeaway: default periods now belong in the data-retrieval instructions because widget tools consume already retrieved data.
- Exploration: the updated prompt requires current-year date filters for undated single-period questions and leaves explicit all-time requests unfiltered.
- Prevention rule: whenever an AI Chat analysis default changes, update the prompt and verify the resulting read-tool filters before a widget can be prepared.

### 2026-08-02 - AI Chat Widget Input Models
- Takeaway: make each model-facing widget payload a dedicated, minimally described Pydantic model; keep renderer discriminators out of its input.
- Exploration: schema and tool tests proved generic matching-width table rows and backend-calculated pie shares without asking the model for `kind`, table variants, or percentages.
- Prevention rule: add any derivable visual value in the widget tool with a regression test; expose only the source values needed to derive it in the tool's input schema.

### 2026-08-02 - AI Chat Visual Selection
- Takeaway: reserve widgets for data whose relationships benefit from a visual; communicate a single aggregate in the agent's text.
- Exploration: removing the summary tool, response union, API parser, and renderer while rejecting its retired payload on both clients left table, bar, line, and pie contracts green.
- Prevention rule: do not add a summary widget without a user-approved visual-only insight that cannot be conveyed clearly in the response text.

### 2026-08-02 - AI Chat Flexible Widget Inputs
- Takeaway: express chart metrics as generic `{ value, display }` data and named series, never as finance-specific fields such as `income`, `spending`, or `currency`.
- Exploration: the Agents SDK strict schema rejects map-like `additionalProperties`; a list of labelled values safely supports arbitrary one- or multi-series bar and line charts.
- Prevention rule: keep `kind` backend-owned, calculate pie shares in code, and cover arbitrary count/money series, mismatched labels, and a non-echoing widget acknowledgement in widget-tool tests.

### 2026-08-03 - AI Chat Currency Context
- Takeaway: retain the default-currency input context even when the product assumes a single currency.
- Exploration: the single-currency instruction prevents splitting an analysis but does not give the model a currency label for generated display text.
- Prevention rule: keep the explicit `Default currency` input line and assert it in the prompt/input regression test.

### 2026-08-14 - Embedded refund logs
- Takeaway: Persist refund logs as typed JSON and retain the transaction amount as the sole analytics input; do not create separate refund transactions.
- Exploration: API parity coverage confirmed full refunds reach zero, list reads return persisted logs, and an edited expense SMS updates parent fields while retaining the refund log.
- Prevention rule: Require the final `refunds` array on every transaction update; validate unique positive two-decimal entries before mutation, and let SMS reprocessing update refunded expenses without allowing them to become income.

### 2026-08-27 - SMS Parser Structured Output Contract
- Takeaway: Do not send Pydantic's default `Decimal | None` schema to OpenAI strict structured outputs; its nullable string branch contains a rejected regex lookaround.
- Exploration: `Annotated[Decimal, WithJsonSchema({"type": "number"})] | None` emits `number | null`, is accepted by Luna, and returns a runtime `Decimal` without a wire-model conversion.
- Prevention rule: Keep the established parser prompt unchanged during model migration; inspect `model_json_schema()`, pass a typed `Reasoning` object with `summary: "auto"`, and omit unsupported `temperature` for reasoning-model requests. Expect no summary item when a trivial request uses zero reasoning tokens.

### 2026-08-27 - GPT-5.6 Luna AI Chat Tool Schemas
- Takeaway: Do not expose Pydantic's default nullable `Decimal` schema in an Agents tool; Luna rejects its string branch's regex lookaround before it can call a tool.
- Exploration: A numeric `WithJsonSchema` override preserved runtime `Decimal` parsing and let both Mini and Luna complete the synthetic balance and table workflows with the unchanged prompt and tool set.
- Prevention rule: Serialize every affected tool's `params_json_schema` and assert it contains no regex lookaround before enabling a GPT-5.6 model; run the synthetic live chat comparison after a model migration.

### 2026-08-27 - SMS Parser Reasoning Default
- Takeaway: Use Luna low reasoning for bounded SMS extraction when it matches medium on a representative non-identifying corpus.
- Exploration: Low and medium each passed 10/10 fabricated cases; low took 16.37 seconds versus medium's 25.16 seconds. Do not send real or repository SMS text to an external evaluator without explicit approval.
- Prevention rule: Keep the generic prompt and numeric Decimal schema unchanged; raise effort only after a quality gain on approved or redacted representative inputs.

### 2026-08-27 - Production Category Eval Corpus
- Takeaway: Build category-selection regressions from verified production payloads, not shared local or CI traces.
- Exploration: Eight calls using the real IDs 50–99 passed at both medium (32.43s) and low (19.57s); calls containing `it_` category names were ruled out as test data.
- Prevention rule: Preserve each source response ID, categories, examples, and expected `top_category_id`; rerun this corpus before changing the category model, prompt, or reasoning default.

### 2026-10-24 - SMS Extraction Model
- Takeaway: Use `gpt-6-luna` with explicit low reasoning and automatic summaries for SMS extraction; retain generative note descriptions.
- Exploration: The 16-case corpus repeated three times passed 33/33 signed amount/currency checks and 15/15 abstentions; six note-similarity failures concerned Apple/CORK and CBD descriptions.
- Prevention rule: Maintain one extraction implementation and its shared test suite. Keep balance-only and AED-priority cases in migration validation, report note differences separately, and do not disable reasoning without demonstrating equivalent financial behavior.

### 2026-10-24 - OpenAI SDK 3 and Decisions Categories
- Takeaway: Use native HTTPX2 mocks when upgrading OpenAI SDK 3 or Agents >=0.21; keep unrelated Telegram/API HTTPX clients on their explicit dependency.
- Exploration: SDK 3.37.0 and Agents 0.24.0 passed existing unit/type checks, structured-output and SDK-error transport tests, an Agents provider round trip, and the live category comparison. After aligning optional-abstention instructions, both endpoints passed 42/42 on 14 cases repeated three times. A preliminary identical Responses prompt had four mismatches, and warm-cache pricing materially changed between runs.
- Prevention rule: Include an explicit abstention choice, retain complete usage/cache counts, separate production labels from synthetic safety cases, and do not treat repeated small-corpus results as a production guarantee. Audit required Starlette/FastAPI upgrades and OS certificate trust before deployment.

### 2026-10-24 - Live LLM Test Client Ownership (BR-026)
- Takeaway: Close each real-test SDK client before its owning `asyncio.run` loop exits; never reuse its pooled connections on a later loop.
- Exploration: Native HTTPX2 exposed a cached client crossing test loops as `RuntimeError: Event loop is closed`; loop-scoped SMS/category helpers passed the four-case real-API regression afterward.
- Prevention rule: Keep product clients pooled on the application event loop, but isolate and close live-test clients inside their test loop. Use one loop/client for a sequential benchmark and report model errors separately from transport/lifecycle failures.

### 2026-10-24 - Production Category Decisions
- Takeaway: Category selection uses Decisions `choice` on `gpt-6-luna`; the endpoint does not accept a reasoning setting.
- Exploration: Explicit `abstain` preserves non-assignment, and category probabilities supply ordered Telegram alternatives. The canonical live corpus includes production history, new merchants, and missing-category abstention cases; the temporary comparison harness and results were removed after selection.
- Prevention rule: Validate the complete answer distribution before applying a category. Refusals, unknown IDs, and invalid distributions use the existing fallback. Include abstention in the 255-choice limit (at most 254 categories); never truncate the catalog silently.

### 2026-10-28 — Validate category alternatives independently (BR-027)

- Takeaway: Validate Telegram alternative buttons independently of primary-category accuracy; a correct assignment can coexist with unrelated income suggestions on expenses.
- Exploration: A synthetic Decisions distribution with 0.999 on Clothing & Shoes reproduced both income buttons; zero-probability candidates also survive decoding. Existing 18 unit tests passed, and the live corpus checks only the primary category.
- Prevention rule: When changing category selection, cover alternative relevance, transaction direction, negligible probabilities, and tied probabilities; do not assume the second and third ranked choices are meaningful suggestions.
- Direction-filter delivery: use one eligible category set for model choices, returned-ID validation, and fallback/edit buttons. Return fewer buttons when necessary; preserve existing assignments while excluding incompatible buttons. Direction regressions cover both signs, no candidates, invalid model output, unavailable model, and exception fallback.
