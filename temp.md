## Bugs:

### 1. None

## Feature requests:

### 1. Multi-currency support. 
Support all transactions in different currencies and provide automatic conversion at the trx update point based on current exchange rates. User selects single currency for analytics and all conversions are done to that currency for reporting purposes.
+ settings page with ability to select that currenct and sync exchange rates automatically by clicking button. and ability to see the current excange rate that will be applied to the transactions.

### 2. Per-user categories customization support
Users need ability to CRUD their own categories and sub-categories, choose color and icon for them
Pitfalls: when user deletes category, user should be prompted, that all the transactions with that category will be moved to "Uncategorized" category.

### 3. Wallets/Accounts support
Add ability for user to share it's accout/wallet with other users, so the have full controll over the shared account/wallet.
Sending bot messages also should be supported per wallet, so I can have my wallet and shared one and being able to choose which wallet will be used for adding transactions from parsed text in bot

### 4. How can user represent refunds in our app
We need to come up with UX for representing refunds in our app. 
For example, if user has a transaction with amount 100 and then he got a refund of 20, how can he represent it in our app? Should we have a separate transaction type for refunds or should we have a way to link refund to the original transaction or should we provide convinient way to edit existing transaction?
