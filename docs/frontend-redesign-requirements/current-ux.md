# Current UX Baseline (As-Is)

## 1. Product Context
- App runs as Telegram Web App and also supports local development mode.
- Main frontend stack: React + TypeScript + Material UI.
- Primary product areas: Transactions, Analytics, AI Chat.

## 2. Information Architecture
- Routes:
  - `/` -> Transactions
  - `/transactions` -> Transactions
  - `/analytics` -> Analytics
  - `/chat` -> AI Chat
- Global layout:
  - Top app bar title: `Money Track`
  - Bottom navigation with 3 tabs: `Transactions`, `Analytics`, `AI Chat`
- Mobile behavior:
  - Bottom nav hides when virtual keyboard is open.
  - Main content bottom padding reduces when keyboard is open.

## 3. Transactions Screen (Current Behavior)
### 3.1 Filters panel
- Collapsed by default.
- Contains:
  - Text search
  - Date range (`From`, `To`)
  - Category multi-select
  - Amount range (`Min`, `Max`)
  - Tags multi-select
- Active filters are counted and surfaced in header chip.
- Filter changes auto-apply with 500ms debounce.
- Mobile shows active filter summary chips and `Clear All` action.

### 3.2 Transaction list
- Responsive rendering:
  - Mobile: card list
  - Desktop: table
- Data states:
  - Initial loading skeletons
  - Error alert with retry
  - Empty state message when no records
- Infinite scroll:
  - Page size 50
  - Intersection observer sentinel triggers next page load
- Amount display:
  - Positive prefixed with `+`
  - Negative prefixed with `-`

### 3.3 Quick update interactions
- Category quick-assign is available only when transaction has no category.
- Tags can be edited inline via chip-based tag editor.
- Updates call backend immediately and show snackbar status.

### 3.4 Full edit interaction
- `Edit` opens transaction modal dialog.
- Editable fields:
  - Date & time
  - Currency
  - Amount
  - Category
  - Tags
  - Note
- Validation:
  - Date/time required
  - Amount required, numeric, non-zero
- Actions:
  - Save
  - Cancel
  - Delete (with confirmation dialog)
- Mobile keyboard handling:
  - Uses stable viewport logic to avoid modal jump in Telegram iOS keyboard scenarios.

## 4. Analytics Screen (Current Behavior)
- Default date range: current month.
- Fetches full dataset using large page size (`take=10000`) and computes client-side metrics.
- Components:
  - Date range filter card
  - Basic statistics cards
  - Spending by category
  - Spending by tags (top 10)
  - Monthly trends (last 6 months with data)
- Data states:
  - Loading skeletons
  - Error with retry
  - Empty messages per widget when data unavailable
- Date filter is applied client-side using local date boundaries.

## 5. AI Chat Screen (Current Behavior)
- Initial assistant welcome message is pre-rendered.
- Message list supports user and assistant bubbles with timestamps.
- Sending behavior:
  - `Enter` sends
  - `Shift+Enter` adds newline
- Suggestion chips can prefill prompt text.
- While waiting for response:
  - Loading bubble (`AI is thinking...`)
  - Input disabled
- Reset action:
  - Top-right reset icon
  - Confirmation dialog before reset
  - Clears chat history to initial assistant message

## 6. Data and Integration Behavior
- API requests include `X-Telegram-Init-Data` header.
- Base API URL comes from `REACT_APP_API_URL`.
- Transaction tags are fetched from `/api/tags` and reused in filters and edit/tag controls.
- Fallback behavior when backend is unavailable:
  - Transactions, categories, analytics can use mock data in specific hooks/pages.
  - AI chat returns fallback canned responses if webhook call fails.

## 7. Accessibility and UX Safeguards
- Navigation and key action controls include ARIA labels in core places.
- Loading, empty, and error states are consistently surfaced.
- Retry actions exist for core failing paths (transactions and analytics).
- Touch/keyboard escape and outside-click are handled in inline tag editing.

## 8. Current Constraints and Known Gaps
- No create-transaction UI flow in current frontend.
- Current runtime has 3 tabs only; redesign target introduces a 4th `Settings` tab as stub.
- Category filter UI supports multi-select, but API request sends only first selected category (`categoryId`).
- Currency field in edit form allows multiple currencies despite product docs emphasizing AED-only scope.
- AI chat session user id defaults to `1` client-side unless explicitly passed.
- Analytics is fully client-side aggregation (no server-side analytics API).

## 9. Approved Target UX Deltas From Redesign Screenshots
- Navigation target:
  - Bottom navigation includes `Transactions`, `Analytics`, `AI Chat`, `Settings`.
  - `Settings` is a stub destination for now.
- Transaction category editing target:
  - Category update is triggered by tapping the transaction category icon in list context.
  - Category change uses a dedicated category selector surface with grouped expandable categories.
  - Category change is explicit: user confirms selection via dedicated confirmation action.
- Tag editing target:
  - Tags are edited in a dedicated selector surface (not only inline chips).
  - Tag update is explicit via confirmation action (`Done` / `Update` equivalent).
- Analytics target:
  - Analytics includes category drilldown interaction opening a filtered transactions popup/list.
  - Drilldown popup includes close action and preserves current analytics context.
