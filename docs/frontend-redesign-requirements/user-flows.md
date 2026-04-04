# Current User Flows

## Flow 1: Open App and Navigate
- Trigger: user opens Telegram Web App.
- System:
  - Initializes Telegram SDK.
  - Expands web app view.
  - Hides Telegram main/back buttons.
  - Opens Transactions screen.
- User can switch among Transactions, Analytics, AI Chat, and Settings (stub) using bottom navigation.

## Flow 2: Browse and Filter Transactions
- Trigger: user is on Transactions screen.
- Steps:
  1. User opens filter panel.
  2. User updates one or more filter controls.
  3. System debounces for 500ms.
  4. System requests filtered transactions.
  5. User sees refreshed list/cards.
- Edge behavior:
  - Loading skeletons on fetch.
  - Error alert with Retry on failure.
  - Empty state if no matching records.

## Flow 3: Infinite Scroll Through Transactions
- Trigger: user scrolls near bottom of list.
- Steps:
  1. Sentinel enters viewport.
  2. System requests next page (`skip += 50`).
  3. New transactions append to existing list.
- Edge behavior:
  - Spinner shown while loading next page.
  - Stops when `hasMore` is false.

## Flow 4: Change Category From Transaction Category Icon
- Trigger: user taps a transaction category icon.
- Steps:
  1. System opens category selector surface.
  2. User searches and/or expands category groups.
  3. User selects category candidate.
  4. User confirms category via explicit confirmation action.
  5. System submits transaction update payload with new `categoryId`.
  6. System updates transaction row/card and shows success feedback.
- Failure:
  - User sees failure feedback and original category remains.

## Flow 5: Edit Tags With Explicit Confirmation
- Trigger: user opens tag editing from transaction context.
- Steps:
  1. System opens tag selector surface.
  2. User adds/removes tags via chip grid and/or search.
  3. User confirms update with explicit action (`Done` / `Update` equivalent).
  4. System submits tag update.
  5. On success, system returns to previous context and shows success feedback.
- Failure:
  - User sees failure feedback; applied tags remain unchanged.

## Flow 6: Full Transaction Edit
- Trigger: user clicks edit action.
- Steps:
  1. Edit dialog opens with prefilled fields.
  2. User updates any field.
  3. User clicks Save.
  4. System validates required fields and submits update.
  5. Dialog closes and transaction row/card updates.
- Optional delete branch:
  1. User clicks Delete.
  2. Confirmation dialog appears.
  3. User confirms.
  4. System deletes transaction and removes it from list.

## Flow 7: Analyze Spending
- Trigger: user opens Analytics tab.
- Steps:
  1. System fetches transaction dataset.
  2. System computes statistics client-side.
  3. User optionally changes date range.
  4. System re-filters and recomputes widgets.
- Output widgets:
  - Total income/expenses/balance/avg transaction
  - Spending by category
  - Spending by tags
  - Monthly trends

## Flow 8: Drill Down Into Category Transactions From Analytics
- Trigger: user taps category block/item from analytics category section.
- Steps:
  1. System opens category-filtered transactions popup/list over analytics context.
  2. Popup header shows selected category and period summary.
  3. User scrolls category transactions list.
  4. User closes popup with close action.
- Outcome:
  - User returns to analytics view with filters/context preserved.

## Flow 9: Ask AI About Spending
- Trigger: user opens AI Chat and enters message.
- Steps:
  1. User sends message or taps suggestion chip.
  2. User message and loading bubble appear.
  3. System sends webhook request with `message`, `userId`, `sessionId`, `timestamp`.
  4. Assistant reply replaces loading bubble.
- Failure:
  - Either fallback assistant text (service-level failure) or snackbar error (unexpected exception).

## Flow 10: Reset AI Session
- Trigger: user taps reset icon.
- Steps:
  1. Confirmation dialog appears.
  2. On confirm, system resets AI session id.
  3. Conversation resets to initial assistant welcome message.

## Flow 11: Open Settings Stub
- Trigger: user taps `Settings` tab in bottom navigation.
- Outcome:
  - Settings stub screen opens with placeholder content (no committed functional settings scope yet).
