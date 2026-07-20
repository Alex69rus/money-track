## Bugs:

### 1. On the transaction edit - category selection or quick category selection selector values are not filtered by expense income.
NOTE: The flow when user on edit transaction screen changes the transaction type from expense to income or vice versa, the category selector should filter the categories based on the selected transaction type

### 2. Sub-categories icons are almost overlapping with the sub-category name. Screenshot attached: bugs_reports/sub_cat_icon_bug.jpg

## Feature requests:

### 1. Multi-currency support. 
Support all transactions in different currencies and provide automatic conversion at the trx update point based on current exchange rates. User selects single currency for analytics and all conversions are done to that currency for reporting purposes.
+ settings page with ability to select that currenct and sync exchange rates automatically by clicking button. and ability to see the current excange rate that will be applied to the transactions.

### 2. Implement AI chat
The main idea: we have anlytics screen for adhoc, most popular analytic widgets, and for all any other questions/queries user can ask AI chant, so it should be very flexible to serve any user question.
User can use AI chat to ask any questions about their transactions. Should be 100% secure and check authorization enforced by code, not by LLM
Find a way to give maximum flexebility to LLM to do analytic queries, but **enforce autorization by user in 100% cases by code**
?? Design some kind of widgets for chat for representing data in a more visual way, like charts, tables, bars, linebars; So LLM can present information in visual way if it will decide so ??

Tech stack: For LLM orchestration we will use OpenAI Agents SDK + custom tools. Docs: https://openai.github.io/openai-agents-python/ (gh: https://github.com/openai/openai-agents-python). No conversations storage needed

### 3. Per-user categories customization support
Users need ability to CRUD their own categories and sub-categories, choose color and icon for them
Pitfalls: when user deletes category, user should be prompted, that all the transactions with that category will be moved to "Uncategorized" category.

### 4. Wallets/Accounts support
Add ability for user to share it's accout/wallet with other users, so the have full controll over the shared account/wallet.
Sending bot messages also should be supported per wallet, so I can have my wallet and shared one and being able to choose which wallet will be used for adding transactions from parsed text in bot

### 5. How can user represent refunds in our app
We need to come up with UX for representing refunds in our app. 
For example, if user has a transaction with amount 100 and then he got a refund of 20, how can he represent it in our app? Should we have a separate transaction type for refunds or should we have a way to link refund to the original transaction or should we provide convinient way to edit existing transaction?
