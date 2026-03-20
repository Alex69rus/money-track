# `SavingTransactions` n8n Workflow Analysis

Source workflow: `n8n/workflows/SavingTransactions.json`
Workflow name: `SavingTransactions`
Workflow id: `e9sKj4kbP9bvv1fx`
Version id: `0d188bfc-02d8-4d67-8ba0-59358570b81c`
Status: `active: true`
Execution order: `v1`

## 1. Purpose and high-level idea

This workflow ingests Telegram SMS-like messages, extracts transaction data with an AI agent, and then either:

- creates a new record in Notion (Budget Tracker database), or
- updates an existing Notion record when the Telegram message is an edit/reply that references a previous message.

If extraction fails, validation fails, or a downstream Notion write errors, it sends a Telegram reply: `Cannot parse the transaction`.

The AI behavior is strict extraction only (no inference), with a structured output parser enforcing `amount/currency/note` shape.

## 2. End-to-end execution flow

```mermaid
flowchart LR
    T[Telegram Trigger] --> E[Edit Fields]
    E --> AU{Allowed users filter}
    AU -- true --> AI[AI Agent]
    AU -- false --> END1[Stop (no reply)]

    OAI[OpenAI Chat Model] -. ai_languageModel .-> AI
    SOP[Structured Output Parser] -. ai_outputParser .-> AI

    AI -- main output 0 --> CP{Check if SMS was parsed}
    AI -- error output 1 --> U[Unparsed SMS message]

    CP -- true --> IR{Is it reply message}
    CP -- false --> U

    IR -- true --> FR[Find record]
    IR -- false --> SN[Save transaction Notion]

    FR --> RF{If record found}
    RF -- true --> UR[Update Record]
    RF -- false --> SN

    UR -- success output 0 --> RU[Reply about update]
    UR -- error output 1 --> U

    SN -- success output 0 --> RC[Reply about create]
    SN -- error output 1 --> U
```

## 3. Node-by-node breakdown

### 3.1 `Telegram Trigger` (`n8n-nodes-base.telegramTrigger`)

- Triggered on Telegram updates: `message`, `edited_message`.
- Emits raw Telegram payload as input item.
- Credential: `telegramApi` (`MyJarvisK`).

### 3.2 `Edit Fields` (`n8n-nodes-base.set`)

Normalizes Telegram payload into stable fields used by later nodes.
`alwaysOutputData: true`.

Assigned fields:

1. `message_date` (number)
   - Expression: `{{ $json.edited_message?.edit_date ? $json.edited_message.date : $json.message.date }}`
2. `message_id` (number)
   - Expression: `{{ $json.edited_message?.message_id ? $json.edited_message.message_id : $json.message.message_id }}`
3. `from_id` (number)
   - Expression: `{{ $json.edited_message?.from.id ? $json.edited_message.from.id : $json.message.from.id }}`
4. `message_text` (string)
   - Expression: `{{ $json.edited_message?.text.trim() ? $json.edited_message.text : $json.message.text }}`
5. `message_id_for_update` (number)
   - Expression: `{{ $json.edited_message?.message_id ? $json.edited_message.message_id : $json.message?.reply_to_message?.message_id }}`

### 3.3 `Allowed users filter` (`n8n-nodes-base.if`)

- Condition: `from_id == 459885395`.
- True branch -> `AI Agent`.
- False branch -> no connected node (execution stops silently).

### 3.4 `OpenAI Chat Model` (`@n8n/n8n-nodes-langchain.lmChatOpenAi`)

- Provides language model to AI Agent via `ai_languageModel` connection.
- Model: `gpt-4.1-mini`.
- Credential: `openAiApi` (`MyJarvisK`).

### 3.5 `Structured Output Parser` (`@n8n/n8n-nodes-langchain.outputParserStructured`)

- Provides structured parse contract to AI Agent via `ai_outputParser` connection.
- Schema example configured:

```json
{
  "amount": -13.55,
  "currency": "AED",
  "note": "Purchase at Carrefour"
}
```

### 3.6 `AI Agent` (`@n8n/n8n-nodes-langchain.agent`)

- Input text: `{{ $json.message_text }}`.
- Uses the connected OpenAI model and structured output parser.
- `onError: continueErrorOutput` (so parse/runtime failures go to output index 1).

Exact system prompt configured:

```text
You are an information extraction system for financial SMS alerts.
Your task is to extract only what is explicitly written in the SMS text.
If the SMS lacks any required field or if extraction is uncertain, return an empty JSON object.

Extract the following fields:
- Amount: A single numerical value, signed. Use a negative value for expenses (e.g. purchase, debit, payment). Use a positive value for income (e.g. credit, salary, refund).
- Currency: The currency associated with the Amount (e.g., "AED", "USD").
- Note: The merchant/shop/entity name involved in the transaction, if clearly mentioned. If it's not presented in the SMS summarize the sms in few words

Strict Rules:
1. Never infer or assume information not explicitly present. Only return what is clearly stated in the SMS.
2. Always extract ONLY ONE AED amount if SMS contains more that one amount and currency. Amount in AED has the highest priority.
3. Determine the sign of the amount:
- Use a negative sign (-) for expenses like purchases, debits, payments.
- Use a positive sign (+) for credits like refunds, deposits, earnings.
4. If you cannot reliably extract all required fields, return an empty object: {}
5. If the SMS does not clearly match an expense or income, do not guess the sign — return {}.

Output format (as JSON):
{
  "Amount": -123.45,
  "Currency": "AED",
  "Note": "Amazon"
}
If parsing fails, return: {}
```

Routing:

- Output `0` (normal) -> `Check if SMS was parsed`
- Output `1` (error) -> `Unparsed SMS message`

### 3.7 `Check if SMS was parsed` (`n8n-nodes-base.if`)

AND-combined validation to accept AI parse result:

1. `output.amount` is not empty
2. `output.amount != 0`
3. `output.currency` is not empty
4. original `message_text` contains absolute amount string:
   - right value expression: `{{ Math.abs($json.output.amount.replace(/,/g, "")).toString() }}`

Routing:

- True -> `Is it reply message`
- False -> `Unparsed SMS message`

### 3.8 `Is it reply message` (`n8n-nodes-base.if`)

Checks whether this should update an existing transaction:

1. `message_id_for_update` exists
2. `message_id_for_update` is not empty

Routing:

- True -> `Find record`
- False -> `Save transaction Notion` (create flow)

### 3.9 `Find record` (`n8n-nodes-base.notion`, `operation=getAll`)

Queries Notion database (`Budget Tracker`) for matching prior message record.

Config:

- `databaseId`: `1ff8c108-1e1e-8019-ac80-fced1a6c0396`
- `limit`: `5`
- manual filter:
  - `MessageId|number` equals `{{ $('Edit Fields').item.json.message_id_for_update }}`
- `alwaysOutputData: true`

Routing:

- Output `0` -> `If record found`

### 3.10 `If record found` (`n8n-nodes-base.if`)

- Condition: `$json.id` exists.

Routing:

- True -> `Update Record`
- False -> `Save transaction Notion` (fallback create if no existing page found)

### 3.11 `Update Record` (`n8n-nodes-base.notion`, `operation=update`)

Updates an existing Notion page.

Config:

- `pageId`: `{{ $json.id }}`
- `executeOnce: true`
- `onError: continueErrorOutput`
- Properties updated:
  1. `Amount|number` = `{{ $('AI Agent').item.json.output.amount }}`
  2. `Note|title` = `{{ $('AI Agent').item.json.output.note.trim() ? $('AI Agent').item.json.output.note : $json.property_note }}`
  3. `Currency|select` = `{{ $('AI Agent').item.json.output.currency }}`

Routing:

- Output `0` (success) -> `Reply about update`
- Output `1` (error) -> `Unparsed SMS message`

### 3.12 `Save transaction Notion` (`n8n-nodes-base.notion`, create)

Creates a new Notion page in Budget Tracker.

Config:

- `databaseId`: `1ff8c108-1e1e-8019-ac80-fced1a6c0396`
- `title`: `{{ $('AI Agent').item.json.output.note ?? '' }}`
- `retryOnFail: true`, `maxTries: 2`
- `onError: continueErrorOutput`

Properties written:

1. `Date|date` = `{{ new Date($('Edit Fields').item.json.message_date * 1000) }}`
2. `Currency|select` = `{{ $('AI Agent').item.json.output.currency }}`
3. `Amount|number` = `{{ parseFloat($('AI Agent').item.json.output.amount) }}`
4. `SmsText|rich_text` = `{{ $('Edit Fields').item.json.message_text }}`
5. `MessageId|number` = `{{ $('Edit Fields').item.json.message_id }}`

Routing:

- Output `0` (success) -> `Reply about create`
- Output `1` (error) -> `Unparsed SMS message`

### 3.13 `Reply about update` (`n8n-nodes-base.telegram`)

Sends confirmation Telegram reply:

```text
Transaction was successfully updated.
Amount: {{ $json.property_amount }}
Currency: {{ $json.property_currency }}
Note: {{ $json.property_note }}
```

Uses:

- `chatId = {{ $('Edit Fields').item.json.from_id }}`
- `reply_to_message_id = {{ $('Edit Fields').item.json.message_id }}`

### 3.14 `Reply about create` (`n8n-nodes-base.telegram`)

Sends creation confirmation Telegram reply:

```text
Transaction was logged.
date: {{ $json.property_date.start }}
amount: {{ $json.property_amount }}
currency: {{ $json.property_currency }}
note: {{ $json.property_note }}
```

Uses:

- `chatId = {{ $('Edit Fields').item.json.from_id }}`
- `reply_to_message_id = {{ $('Edit Fields').item.json.message_id }}`

### 3.15 `Unparsed SMS message` (`n8n-nodes-base.telegram`)

Fallback reply for parse/write failures:

```text
Cannot parse the transaction
```

Uses:

- `chatId = {{ $('Edit Fields').item.json.from_id }}`
- `reply_to_message_id = {{ $('Edit Fields').item.json.message_id }}`

## 4. Connection map (exact)

1. `Telegram Trigger` (main:0) -> `Edit Fields`
2. `Edit Fields` (main:0) -> `Allowed users filter`
3. `Allowed users filter` (main:0) -> `AI Agent`
4. `OpenAI Chat Model` (ai_languageModel:0) -> `AI Agent`
5. `Structured Output Parser` (ai_outputParser:0) -> `AI Agent`
6. `AI Agent` (main:0) -> `Check if SMS was parsed`
7. `AI Agent` (main:1 error output) -> `Unparsed SMS message`
8. `Check if SMS was parsed` (main:0 true) -> `Is it reply message`
9. `Check if SMS was parsed` (main:1 false) -> `Unparsed SMS message`
10. `Is it reply message` (main:0 true) -> `Find record`
11. `Is it reply message` (main:1 false) -> `Save transaction Notion`
12. `Find record` (main:0) -> `If record found`
13. `If record found` (main:0 true) -> `Update Record`
14. `If record found` (main:1 false) -> `Save transaction Notion`
15. `Update Record` (main:0 success) -> `Reply about update`
16. `Update Record` (main:1 error output) -> `Unparsed SMS message`
17. `Save transaction Notion` (main:0 success) -> `Reply about create`
18. `Save transaction Notion` (main:1 error output) -> `Unparsed SMS message`

## 5. Input parameters used by this workflow

## 5.1 Runtime input from Telegram event payload

Directly referenced Telegram fields:

1. `message.date`
2. `message.message_id`
3. `message.from.id`
4. `message.text`
5. `message.reply_to_message.message_id`
6. `edited_message.edit_date` (used as condition flag)
7. `edited_message.date`
8. `edited_message.message_id`
9. `edited_message.from.id`
10. `edited_message.text`

Derived/normalized internal fields (`Edit Fields` output):

1. `message_date`
2. `message_id`
3. `from_id`
4. `message_text`
5. `message_id_for_update`

## 5.2 Static/configuration inputs

1. Allowed Telegram user id: `459885395`
2. OpenAI model: `gpt-4.1-mini`
3. Notion database id: `1ff8c108-1e1e-8019-ac80-fced1a6c0396`
4. Notion property keys used:
   - `Date|date`
   - `Currency|select`
   - `Amount|number`
   - `SmsText|rich_text`
   - `MessageId|number`
   - `Note|title` (update path)
5. AI extraction prompt text (exact block above)
6. Structured parser schema example (exact JSON block above)

## 6. Output parameters and side effects

Primary side effects are external writes/messages:

1. Notion page create (`Save transaction Notion`)
2. Notion page update (`Update Record`)
3. Telegram confirmation or fallback reply

## 6.1 AI Agent output contract (as consumed downstream)

Downstream nodes consume:

1. `output.amount`
2. `output.currency`
3. `output.note`

Validation requires:

- non-empty `output.amount`
- `output.amount != 0`
- non-empty `output.currency`
- amount text appears in original `message_text`

## 6.2 Notion create output fields consumed by Telegram reply

`Reply about create` reads from Notion node output:

1. `property_date.start`
2. `property_amount`
3. `property_currency`
4. `property_note`

## 6.3 Notion update output fields consumed by Telegram reply

`Reply about update` reads:

1. `property_amount`
2. `property_currency`
3. `property_note`

## 6.4 Telegram outputs

Possible final user-visible messages:

1. `Transaction was logged...` (create success)
2. `Transaction was successfully updated...` (update success)
3. `Cannot parse the transaction` (AI/validation/Notion error fallback)

## 7. AI-specific behavior that must remain unchanged

To preserve identical behavior during migration, keep these exactly:

1. Same model selection: `gpt-4.1-mini`.
2. Same system prompt text and rules, including AED prioritization and empty-object fallback.
3. Same structured parser shape (`amount`, `currency`, `note`).
4. Same post-AI validation logic (`Check if SMS was parsed`) including message-text contains-amount check.
5. Same error routing semantics:
   - AI agent error output -> unparsed message.
   - Notion create/update error output -> unparsed message.

## 8. Practical as-built semantics to preserve

1. Only one hardcoded allowed Telegram user is processed; all others are ignored silently.
2. Reply/update mode decision is based on `message_id_for_update` existence.
3. If update was requested but no matching Notion record found, flow falls back to creating a new record.
4. For update note field, existing note is kept when AI note is empty/blank.
5. Fallback message is also used for downstream write errors, not only for AI parse failures.

