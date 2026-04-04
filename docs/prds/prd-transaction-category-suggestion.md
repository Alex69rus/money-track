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
   - Parsed transaction fields (`note`, `amount`, `currency`).
   - Similar historical transactions (same user) with existing categories.
   - Full available category list.
3. Auto-apply top recommended category to the just-saved transaction.
4. Reply in Telegram with actionable category controls:
   - Top-3 LLM category buttons.
   - One button to remove category assignment.

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
  - `transaction_date` can be used for internal ranking/recency, but is not sent to LLM for category selection.

### FR-3: Category candidate context
- Fetch all available categories from DB.
- Provide category id + name (+ type if present) to LLM prompt.

### FR-4: LLM category proposal
- Input context includes:
  - Current transaction: note, sms_text, amount, currency.
  - Similar categorized examples (up to 3 distinct-category rows).
  - Available categories.
- LLM outputs ranked candidates (1..N), with top-1 required.
- For v1 execution:
  - System auto-applies top-1 category.
  - System surfaces top-3 categories as Telegram actions for quick correction.

### FR-5: Apply recommendation
- If top-1 category maps to valid category id from DB list, update saved transaction `category_id`.
- If LLM result invalid/empty, keep transaction uncategorized.
- Never fail whole ingestion because recommendation step fails.

### FR-6: Telegram response with 4 inline actions
- Success reply includes assigned category name (if assigned).
- Add exactly 4 inline action buttons:
  1. Top-1 suggested category
  2. Top-2 suggested category
  3. Top-3 suggested category
  4. **"Remove category"**
- On category button click:
  - Button sends `callback_data`; Telegram delivers `callback_query` to bot webhook.
  - Webhook handler validates payload/user ownership and invokes backend category-update service.
  - Bot updates transaction `category_id` to selected category.
  - Bot sends a new confirmation message (no bot message edit flow).
- On **"Remove category"** click:
  - Button sends `callback_data` with remove action; webhook handler validates and processes it.
  - Bot sets `category_id = null`.
  - Bot sends a new confirmation message (no bot message edit flow).

### FR-7: Idempotency and edits
- Re-processing same message (`user_id`, `message_id` upsert path) should be deterministic:
  - On edited Telegram messages, re-run suggestion only when transaction `category_id` is currently null.
  - If `category_id` is already selected, skip suggestion on edit.

## 7) UX Requirements (Telegram)

### New saved-reply format
- Existing fields remain: Date, Amount, Currency, Note.
- Add `Category: <name>` when assigned, else `Category: Not assigned`.
- Add inline keyboard with 4 buttons:
  - `Category A` (LLM top-1)
  - `Category B` (LLM top-2)
  - `Category C` (LLM top-3)
  - `Remove category`
- If fewer than 3 valid LLM suggestions are available, fill remaining category buttons with deterministic fallbacks from available categories (excluding duplicates) so UX always shows 4 buttons.
  - Fallback ordering rule:
    - Keep global stable ordering baseline (`order_index`, then `name`).
    - Prioritize categories whose `type` matches transaction amount sign (`Expense` for negative, `Income` for positive), then append remaining categories in stable order.

### Callback behavior
- Secure callback payload should include transaction identifier (compact + signed if possible).
- Buttons must use Telegram `callback_data`; no direct client-to-API call from Telegram app.
- Server-side flow: `callback_query` webhook -> validate callback payload + `user_id` ownership -> apply category change.
- On category selection success: `Category updated to: <CategoryName>`.
- On removal success: `Category removed. You can set it manually in app.`
- For each callback, always send a new confirmation message.
- On already-selected/already-removed state: idempotent confirmation message.

## 8) Data and Query Requirements

## Similar examples query (logical)
- Source: `transaction` joined with `category`.
- Filters:
  - `transaction.user_id = current_user_id`
  - `transaction.category_id IS NOT NULL`
  - `transaction.note ILIKE '<current_note_prefix>%'` (prefix search, user-scoped)
  - Exclude current transaction id.
- Distinct by category (`DISTINCT ON (category_id)` or equivalent Piccolo strategy).
- Rank by similarity + recency, limit 3.
  - Implementation should keep category-distinct reduction in DB query (avoid loading large candidate sets and de-duplicating in application memory).

## Category list query
- Fetch global categories table (id, name, type).
- Stable ordering by `order_index`, then `name`.

## 9) LLM Prompt/Output Contract

### Prompt policy
- Constrain to choose from provided category ids only.
- Strongly bias to historical prefix-note matches.
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
- `alternatives` should contain unique category ids, ordered best-to-worst, target length >= 3 when possible.
- If invalid -> treat as no suggestion.
- Do not persist alternatives/confidence in v1.

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
- `category_overridden_by_user`
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

## 14) Technical Implementation Requirements

1. Keep architecture boundaries explicit:
   - Business logic layer: category selection pipeline, note-based retrieval, LLM decision handling, and DB updates.
   - Integration layer: Telegram message formatting, inline keyboard construction, `callback_query` handling, and webhook transport concerns.
2. Do not mix business logic with Telegram integration code. Integration handlers must orchestrate calls into business services rather than embed category-selection/query logic inline.
3. Category update from Telegram callbacks must flow through business-service boundaries with user-scoped validation.

## 15) Testing Requirements

1. Add an end-to-end test for this flow with Telegram isolation:
   - Input: SMS text.
   - Output/assertions: saved transaction includes selected category and exactly 3 suggested categories matching expected result.
2. Test must use real database and real LLM calls.
3. Test must not touch real Telegram infrastructure (no real webhook/network calls to Telegram); Telegram transport must be isolated/mocked at integration boundary.

## 16) Rollout Plan

1. Implement and verify locally.
2. Run manual end-to-end testing for parse, auto-assign, category override, and removal actions.
3. Deploy directly after successful manual validation.

## 17) Acceptance Criteria

1. Parsed SMS still saves transaction successfully with existing behavior.
2. For eligible transactions, category is auto-assigned immediately after save.
3. Similar examples provided to LLM are max 3 and category-distinct.
4. Telegram reply shows assigned category and `Remove category` action.
5. Telegram reply contains exactly 4 inline actions (top-3 categories + remove category).
6. Clicking any category action is handled via Telegram `callback_query` webhook flow and updates `category_id` with user-scoped validation.
7. Clicking `Remove category` via callback flow clears `category_id` and sends a confirmation message.
8. Suggestion failure does not block transaction creation.
9. All operations remain scoped by `user_id`.
10. On Telegram message edits, suggestion runs only if transaction category is currently not selected.

## 18) Resolved Decisions

1. Auto-suggestion on edited Telegram messages runs only when transaction `category_id` is null.
2. No special correction-memory logic is needed now; category diversity is handled by fetching up to 3 examples with distinct categories.
3. Confidence/alternatives are not stored.
4. Note similarity in v1 uses `ILIKE` prefix search (`'<prefix>%'`) with mandatory `user_id` filter.
5. Message action buttons (top-3 categories + remove/cancel) use Telegram `callback_data`; backend handles `callback_query` and applies updates server-side (service call in-process, or internal API call if bot/API are split).
6. Fallback categories (when LLM returns fewer than 3) are filled in stable category order (`order_index`, then `name`).
7. LLM context includes original `sms_text` in addition to `note`, `amount`, and `currency`.
8. Fallback category prioritization is sign-aware: for positive amounts prioritize `Income` categories; for negative amounts prioritize `Expense` categories; then append remaining categories in stable order.

## 19) Out of Scope for This PRD

- Frontend category suggestion UI in React transaction screens.
- Multi-language category synonym model.
- Long-term model fine-tuning or embedding infrastructure.
