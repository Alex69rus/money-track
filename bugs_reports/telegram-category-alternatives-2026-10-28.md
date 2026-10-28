# Telegram category alternatives — 2026-10-28

Scope: Telegram bot transaction confirmation; user requested investigation of category suggestions.

## Evidence

| File | Surface | Highlight |
| --- | --- | --- |
| `telegram-category-alternatives-2026-10-28.jpg` | Telegram on iPhone | Correct expense category followed by unrelated income categories |

## BR-027 — Expense confirmation suggests income categories

Priority: P2

Evidence: `telegram-category-alternatives-2026-10-28.jpg`; user report.

### Actual

For `-50 AED for clothes`, the bot saved amount `-50.00`, currency `AED`, note `Clothes`, and category `Clothing & Shoes`. Its buttons are `Clothing & Shoes`, `Other income`, and `Apique salary`.

The same screenshot shows a Waitrose expense of `-50.90 AED`, correctly assigned to `Groceries`, with buttons `Groceries`, `Eating Out`, and `Apique salary`.

### Expected

Suggested alternatives should be plausible for the transaction. An ordinary clothing or grocery purchase should not suggest salary or other income categories.

### Reproduction

1. Submit an expense such as `-50 AED for clothes` to the bot.
2. Inspect the saved transaction confirmation and category buttons.
3. Reported observation: the selected category is correct, but alternative buttons include income categories. Exact production model probabilities have not been recovered.

### Acceptance criteria

- Category alternatives for ordinary negative clothing/grocery payments exclude unrelated income categories.
- Low-confidence or tied residual categories are not presented as meaningful alternatives merely to fill three buttons.
- Correct transaction extraction and primary category assignment are preserved.

### Investigation evidence — 2026-10-28

- State: Triaged. No product code changed; investigation only.
- Migration `350fe97` (2026-10-24) replaced structured model-provided alternatives with `_decode_category_decision`, which sorts all non-abstain categories by probability and unconditionally takes two alternatives. It retains zero-probability categories; ties preserve supplied catalog order.
- The request includes both Income and Expense categories. Neither the decoder nor the successful-suggestion path filters alternatives by transaction direction or probability. `_build_top3_ids` places these alternatives before direction-aware fallback IDs, so the fallback does not remove income suggestions.
- The SMS parser extracts amount/currency/note separately; the Telegram keyboard renders the supplied category options directly.
- Local synthetic reproduction: `PYTHONPATH=backend_new backend_new/.venv/bin/python bugs_reports/telegram-category-alternatives-2026-10-28-repro.py` passed. With primary probability `0.999`, income alternatives of `0.0006` and `0.0003` produced exactly `Clothing & Shoes`, `Other income`, `Apique salary`. With primary probability `1.0`, zero-probability alternatives still appeared. These are constructed probabilities, not recovered production responses.
- Existing unit suite: `backend_new/.venv/bin/python -m pytest --noconftest backend_new/tests/test_category_suggestion.py -q` — 18 passed. The live corpus asserts `top_category_id` only; it does not assess alternative relevance.
- Limit: no production response, history, deployed revision, or probability vector was retrieved. The implementation defect is reproduced; exact probabilities and tie behavior for the photographed messages remain unverified.

### Delivery — direction filtering, 2026-10-28

State: Fixed — verification pending (local service checks passed; deployed Telegram confirmation not checked).

User approved direction filtering. Candidate categories now match the amount sign before the model request. Model-returned primary/alternative IDs are validated against that same eligible set. Default/error/edit actions also exclude opposite-direction categories and may return fewer than three buttons. Existing saved category assignments remain intact, even when their category is excluded from the buttons. Zero/unknown amounts retain the existing unrestricted behavior; an empty eligible catalog skips the model.

Probability thresholds are outside this approved change; low-probability categories of the correct direction can still appear.

Changed: `backend_new/app/services/category_suggestion.py`, `backend_new/tests/test_category_suggestion.py`, retrospective guidance. Updated the standalone reproduction to assert the corrected expense-only buttons; the historical synthetic probabilities above remain investigation evidence.

Verification:

- Red: new/updated direction regressions failed before implementation (12 failing cases).
- `backend_new/.venv/bin/python -m pytest --noconftest backend_new/tests/test_category_suggestion.py -q --tb=short` — 31 passed after implementation.
- From `backend_new`: `uv run ruff format .`, `uv run ruff check .`, `uv run mypy .` — passed (71 typed source files).
- From `backend_new`: `uv run pytest -q --ignore=tests/integration` — 80 passed.
- `PYTHONPATH=backend_new backend_new/.venv/bin/python bugs_reports/telegram-category-alternatives-2026-10-28-repro.py` — passed, buttons `Clothing & Shoes`, `Groceries`, `Eating Out`.
- Deterministic full suite, using fixture-managed temporary API with health polling: `BASE_URL= TEST_DATABASE_URL=postgresql://postgres:password@127.0.0.1:5432/moneytrack RUN_LLM_E2E=0 UV_CACHE_DIR=./.uv-cache uv run pytest -q --ignore=tests/integration/test_category_suggestion_llm_e2e.py --ignore=tests/integration/test_sms_parser_llm_e2e.py --ignore=tests/integration/test_telegram_category_suggestion_e2e.py -o addopts= --tb=short` — 135 passed, 2 skipped, 3 failed.
- Remaining failures: `test_aggregate_tool_rejects_invalid_top_level_pagination`, `test_list_transactions_rejects_invalid_top_level_pagination`, `test_tags_tool_rejects_invalid_top_level_pagination`. Failure class: unrelated contract regression; SDK tool errors contain generic text instead of parameter names. All three reproduced with unmodified `HEAD` application sources extracted to `/tmp/br027-baseline`, using `PYTHONPATH=/tmp/br027-baseline/backend_new backend_new/.venv/bin/python -m pytest --noconftest --import-mode=importlib` and the same three test IDs. No unrelated product fixes made.
- Initial unrestricted suite was interrupted: live-test helpers overrode `RUN_LLM_E2E=0` from `.env`. The run also observed existing SMS note mismatches for `apple_purchase_with_balance` and `cbd_loan_installment_compact_aed`; these concern the unchanged SMS parser. Subsequent deterministic run excluded all real-LLM files explicitly. See `PAPERCUTS.md`.
- `git diff --check` — passed. No deployment performed.

### Code review and pre-push verification — 2026-10-28

- Reviewed candidate selection, model-choice payload, returned-ID validation, fallback/error/edit paths, empty-catalog behavior, saved category display, and variable-length Telegram keyboards. No blocking issue found in the direction-filter change.
- Closed two test-coverage gaps: preserve the model's ordering among eligible alternatives; preserve saved category ID/name when no direction-compatible candidate exists. Formatted the standalone reproduction and sorted its imports.
- Approved scope remains direction filtering. Probability thresholds and same-direction semantic relevance remain explicitly deferred.
- Final checks from `backend_new`: `uv run ruff format --check .`, `uv run ruff check .`, `uv run mypy .` — passed; `uv run pytest -q --ignore=tests/integration -o addopts=` — 82 passed.
- Final targeted integration/API/Telegram command: `BASE_URL= TEST_DATABASE_URL=postgresql://postgres:password@127.0.0.1:5432/moneytrack UV_CACHE_DIR=./.uv-cache uv run pytest tests/integration/test_api_parity.py tests/test_category_suggestion.py tests/test_telegram_ingestion.py tests/test_telegram_runtime.py -q -o addopts= --tb=short` — 80 passed, 2 production-only checks skipped. The fixture starts/stops a temporary API and polls readiness.
- Category suite alone — 33 passed; synthetic screenshot reproduction and `git diff --check` passed.
- The earlier three AI Chat pagination failures were independently reproduced against unmodified HEAD and remain outside this change. All final checks covering the changed area passed.
- `git fetch origin main` completed; local HEAD and origin/main matched before commit. User explicitly authorized committing and pushing to origin/main after review.
