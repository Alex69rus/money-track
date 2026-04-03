# PRD: Automatic Category Suggestion for Parsed SMS Transactions

## 1) Background

Today the Telegram ingestion flow parses SMS into a transaction (`amount`, `currency`, `note`) and saves it without a `category_id`. Users then assign category manually later.

We need a two-step enrichment flow that keeps current parsing behavior but adds category suggestion immediately after parse/save, using historical user transactions and available categories as context for an LLM classification step.

## 2) Problem Statement

- Current state creates uncategorized transactions by default.
- Manual categorization creates friction and delays analytics quality.
- Same merchant/note often repeats, so we can use historical signal to improve category prediction.

## 3) Goals

1. Preserve existing SMS parsing and transaction save behavior as step 1.
2. Add step 2 category recommendation based on:
   - Parsed transaction fields (`note`, `amount`, `transaction_date`).
   - Similar historical transactions (same user) with existing categories.
   - Full available category list.
3. Auto-apply top recommended category to the just-saved transaction.
4. Reply in Telegram with an action to cancel/unset the auto-assigned category.

## 4) Non-goals

- Full interactive multi-choice category picker in Telegram for this iteration.
- Replacing manual category editing in web app.
- Cross-user learning (must remain user-isolated by `user_id`).
- Building embeddings/vector DB (use DB query + LLM only).

## 5) User Stories

- As a bot user, when I send bank SMS, my transaction is saved and categorized automatically when possible.
- As a bot user, I can quickly cancel the suggested category from Telegram if it is wrong.
- As a user, if no confident category is available, transaction should still be saved without category rather than failing.

## 6) Functional Requirements

### FR-1: Two-step processing
1. Parse SMS as done today.
2. Save/upsert transaction as done today.
3. Run category suggestion pipeline after successful parse/save.

### FR-2: Similar transaction retrieval
- Query only current user transactions (`user_id` scoped).
- Use parsed `note` as primary retrieval key.
- Retrieve up to 3 historical examples with:
  - Similar/same note.
  - Non-null `category_id`.
  - Distinct categories (max one example per category).
- Include in context: `note`, `amount`, `transaction_date`, `category_id` + category name.

### FR-3: Category candidate context
- Fetch all available categories from DB.
- Provide category id + name (+ type if present) to LLM prompt.

### FR-4: LLM category proposal
- Input context includes:
  - Current transaction: note, amount, date-time, currency, sms_text (optional short form).
  - Similar categorized examples (up to 3 distinct-category rows).
  - Available categories.
- LLM outputs ranked candidates (1..N), with top-1 required.
- For v1 execution, system applies only top-1 category.

### FR-5: Apply recommendation
- If top-1 category maps to valid category id from DB list, update saved transaction `category_id`.
- If LLM result invalid/empty, keep transaction uncategorized.
- Never fail whole ingestion because recommendation step fails.

### FR-6: Telegram response with cancel action
- Success reply includes assigned category name (if assigned).
- Add inline action button: **"Remove category"**.
- On button click, bot sets `category_id = null` for that transaction and confirms to user.

### FR-7: Idempotency and edits
- Re-processing same message (`user_id`, `message_id` upsert path) should be deterministic:
  - Re-run suggestion and update category unless user manually removed it from Telegram action in same update cycle policy (see open questions).

## 7) UX Requirements (Telegram)

### New saved-reply format
- Existing fields remain: Date, Amount, Currency, Note.
- Add `Category: <name>` when assigned, else `Category: Not assigned`.
- Add inline keyboard with one button: `Remove category` (enabled only when category exists).

### Callback behavior
- Secure callback payload should include transaction identifier (compact + signed if possible).
- On success: `Category removed. You can set it manually in app.`
- On already-removed state: idempotent confirmation message.

## 8) Data and Query Requirements

## Similar examples query (logical)
- Source: `transaction` joined with `category`.
- Filters:
  - `transaction.user_id = current_user_id`
  - `transaction.category_id IS NOT NULL`
  - `transaction.note` similar to current note (exact match first; fallback ilike/normalized match)
  - Exclude current transaction id.
- Distinct by category (`DISTINCT ON (category_id)` or equivalent Piccolo strategy).
- Rank by similarity + recency, limit 3.

## Category list query
- Fetch global categories table (id, name, type).
- Stable ordering by `order_index`, then `name`.

## 9) LLM Prompt/Output Contract

### Prompt policy
- Constrain to choose from provided category ids only.
- Strongly bias to exact historical-note matches.
- Allow abstain when evidence is weak.

### Suggested output schema
```json
{
  "top_category_id": 12,
  "alternatives": [12, 8, 21],
  "confidence": 0.82,
  "reason": "Matched note with recent categorized examples"
}
```

### Validation rules
- `top_category_id` must exist in fetched category ids.
- If invalid -> treat as no suggestion.
- Store alternatives/confidence only if product later needs explainability (optional for v1).

## 10) Error Handling

- Parse failure: current behavior unchanged (`Cannot parse the transaction`).
- Suggestion failure (DB/LLM/validation): log error and continue with uncategorized saved transaction.
- Telegram callback failure: return user-friendly error and log with `exc_info=True`.

## 11) Observability

Add structured logs/counters for:
- `category_suggestion_attempted`
- `category_suggestion_applied`
- `category_suggestion_skipped_no_candidates`
- `category_suggestion_failed`
- `category_removed_by_user`

Track quality KPI:
- **Undo rate** = removed_auto_category / applied_auto_category.

## 12) Security & Privacy

- Keep strict user isolation for retrieval examples.
- Do not send unrelated user data to LLM.
- Limit prompt context to minimal required fields.
- Maintain existing Telegram webhook secret validation and auth behavior.

## 13) Performance Expectations

- Added suggestion step should keep median ingestion latency acceptable for chat UX.
- Target: p50 end-to-end reply < 3s, p95 < 7s (to be validated in staging).
- Timeout/retry policy should avoid duplicate Telegram replies.

## 14) Rollout Plan

1. Implement behind feature flag: `ENABLE_AUTO_CATEGORY_SUGGESTION`.
2. Dark launch: compute suggestion but do not apply/send button; log outcomes.
3. Enable auto-apply for internal user(s).
4. Gradually enable for all users.
5. Monitor undo rate and parsing-to-category success rate.

## 15) Acceptance Criteria

1. Parsed SMS still saves transaction successfully with existing behavior.
2. For eligible transactions, category is auto-assigned immediately after save.
3. Similar examples provided to LLM are max 3 and category-distinct.
4. Telegram reply shows assigned category and `Remove category` action.
5. Clicking `Remove category` clears `category_id` and sends confirmation.
6. Suggestion failure does not block transaction creation.
7. All operations remain scoped by `user_id`.

## 16) Open Questions

1. Should auto-suggestion run on edited Telegram messages that upsert existing rows?
2. If user manually changes category later in web app, should future same-note suggestions prioritize that correction signal?
3. Should we persist confidence/alternatives for analytics or keep transient only?
4. Exact similarity strategy for `note` in v1: exact normalized match only, or include fuzzy matching?
5. If user presses `Remove category`, do we suppress re-auto-assignment for that message permanently?

## 17) Out of Scope for This PRD

- Frontend category suggestion UI in React transaction screens.
- Multi-language category synonym model.
- Long-term model fine-tuning or embedding infrastructure.
