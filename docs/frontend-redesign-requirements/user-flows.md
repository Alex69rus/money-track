# Current Frontend User Flows

## Open and navigate

Telegram launches to Transactions. Users can switch among Transactions, Analytics, AI Chat, and the Settings stub through persistent bottom navigation. Telegram mode has no duplicate web header.

## Browse and filter transactions

Users open Filters and change text, date range, category, tags, or amount range. Changes debounce and refresh the list automatically. The list exposes loading, retry, empty, and incremental-loading states.

## Edit a transaction

Tapping a transaction card or edit control opens a prefilled full-page edit route in Telegram. Users can update amount, currency, date/time, category, tags, and note; required fields validate before save. Save updates the list in place. Delete requires a confirmation dialog.

Category and tag controls open their own full-page selector routes. Both selectors support search and require an explicit update action. Telegram BackButton returns to the prior transaction context.

## Analyze spending

Analytics defaults to the current month and recomputes summary, category, tag, and monthly-trend widgets when the date range changes. Each state has loading, retry, and no-data behavior.

Selecting a category or tag opens a full-page drilldown with the active date context preserved. Telegram BackButton returns to Analytics without losing the parent state; browser mode supplies an equivalent history fallback.

## Ask AI about spending

Users send by button or Enter, while Shift+Enter adds a line break. The timeline distinguishes user and assistant messages, shows a pending state, and provides clear fallback/error feedback. Reset requires confirmation and starts a fresh session.

## Telegram compatibility

Nested flows use the host BackButton. Focused fields move into the usable viewport when the keyboard changes size, and primary/nested pages stay below Telegram safe-area and host-control clearance.
