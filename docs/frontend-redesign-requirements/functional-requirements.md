# Functional Requirements for Future Frontend (Behavior Contract)

## 1. Navigation and Layout
### FR-001
The app MUST expose four primary destinations in bottom navigation: Transactions, Analytics, AI Chat, Settings.

### FR-002
The default landing destination MUST be Transactions.

### FR-003
A persistent top-level app header and bottom navigation MUST exist on mobile and desktop layouts.

### FR-004
On mobile keyboard open, bottom navigation MUST not obstruct focused inputs.

### FR-005
`Settings` destination MUST exist as a stub surface even if detailed settings functionality is out of current scope.

## 2. Transactions Domain
### FR-006
Transactions view MUST support these filter dimensions:
- text search
- date range
- categories
- tags
- amount range

### FR-007
Filter updates MUST auto-apply without explicit submit and SHOULD be debounced to limit request storms.

### FR-008
Transactions list MUST support loading, error-with-retry, and empty states.

### FR-009
Transactions list MUST support paginated/incremental loading for long histories.

### FR-010
Category selection flow MUST be triggered when user taps the category icon in transaction context.

### FR-011
Category selection MUST use a dedicated selector surface with searchable grouped categories and explicit confirmation action before submit.

### FR-012
Tag editing MUST use a dedicated selector surface and explicit confirmation action (`Done` / `Update` equivalent) before submit.

### FR-013
The UI MUST provide full transaction edit in a dedicated interaction surface (modal/sheet/page) with prefilled values.

### FR-014
The full edit flow MUST validate required fields before submit.

### FR-015
The full edit flow MUST support delete with explicit confirmation.

### FR-016
On successful update/delete, the affected transaction item MUST update in-place without full page reload.

### FR-017
Transaction amount presentation MUST preserve sign semantics (`+` income, `-` expense).

## 3. Analytics Domain
### FR-018
Analytics MUST support date-range constrained analysis.

### FR-019
Analytics MUST display, at minimum:
- summary statistics (income, expenses, balance, average)
- spending by category
- spending by tags
- monthly trends

### FR-020
Analytics MUST provide loading, error-with-retry, and no-data states.

### FR-021
Date-range updates in analytics MUST recompute all shown analytics widgets consistently.

### FR-022
Analytics MUST support category drilldown interaction that opens a category-filtered transactions popup/list with explicit close action.

## 4. AI Chat Domain
### FR-023
AI Chat MUST support a message timeline with separate user and assistant messages.

### FR-024
AI Chat MUST support message send by button and keyboard submit (`Enter`), while preserving multiline input (`Shift+Enter`).

### FR-025
AI Chat MUST show a pending assistant state while awaiting response.

### FR-026
AI Chat MUST support session reset with confirmation.

### FR-027
On response failures, AI Chat MUST surface a user-visible error or fallback response.

## 5. Data Integration and API Behavior
### FR-028
Frontend API requests MUST include Telegram init data header for authenticated backend interaction.

### FR-029
Frontend MUST remain configurable via environment-based API base URL.

### FR-030
Tag options used in filter/edit quick interactions MUST be fetched from backend user tags endpoint.

### FR-031
When backend is unreachable in development/testing contexts, frontend SHOULD support controlled fallback behavior (mock/fallback) without app crash.

## 6. Responsive and Interaction Requirements
### FR-032
Transactions UI MUST provide responsive representations for small and large viewports.

### FR-033
Critical interaction controls MUST remain reachable in Telegram Web App viewport constraints.

### FR-034
Search/select controls for categories and tags MUST support fast lookup over large option sets.

## 7. Accessibility and Usability
### FR-035
Interactive controls MUST include accessible labels or equivalent semantic text.

### FR-036
All asynchronous operations that impact user actions MUST provide visible progress feedback.

### FR-037
All recoverable failures in critical flows (transactions list, analytics load, save/update actions) MUST provide retry or clear recovery path.

## 8. Compatibility Notes and Constraints To Preserve or Resolve
### FR-038
Transactions filtering UI MUST use single-category selection in redesign scope.

### FR-039
Transaction edit flow MUST keep multi-currency support across UI and API payloads.

### FR-040
Any new tabs/screens beyond approved scope (Transactions, Analytics, AI Chat, Settings stub) MUST NOT be assumed in implementation without approved product scope extension.
