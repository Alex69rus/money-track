# PRD: AI Transaction Chat

## 1) Background

The Analytics screen covers the most common financial questions with fixed widgets. Users also need a flexible way to ask questions in their own words, for example:

- “How much did I spend on restaurants last month?”
- “What changed between this month and last month?”
- “Show my largest subscriptions in the last 90 days.”
- “Which categories grew the most this quarter?”

AI Transaction Chat complements Analytics. It is an analytical assistant for a user's own transaction data, not a replacement for the existing analytics screen.

## 2) Problem Statement

Fixed reports cannot anticipate every useful question about a person's spending. An LLM can interpret flexible questions, but it must never decide who may access data or be able to damage product data.

The product needs to combine flexible, natural-language analysis with deterministic authorization that is enforced by backend code in every case.

## 3) Goals

1. Let users ask natural-language questions about their transaction history.
2. Answer questions about spending, income, balance, categories, tags, merchants, transaction history, and trends.
3. Present results in the clearest form: text, table, chart, bars, or a trend line.
4. Ensure a user can access only their own data, regardless of what they ask or what the LLM attempts to do.
5. Keep the first version read-only: chat must never change Money Track data.
6. Keep the feature simple and focused on analytical questions; do not turn it into a general-purpose agent.
7. Ensure answers and visuals are grounded in the user's real transaction data and never invent facts, values, or transactions.

## 4) Non-goals

- Creating, editing, categorizing, deleting, importing, or exporting transactions through chat.
- Financial, tax, investment, lending, or legal advice.
- Web search, bank access, external account access, or actions outside Money Track.
- Multi-modal input, including images, audio, video, files, or documents.
- Replacing the existing Analytics screen or its common widgets.
- Long-lived dialogues, dialogue history, or the ability to switch between past dialogues.
- Supporting multi-currency analysis until the multi-currency feature defines reliable converted values for analytics.

## 5) User Experience Requirements

### FR-1: Ask questions in chat

- Users can open AI Transaction Chat from the Mini App and send questions in natural language.
- Chat accepts text input only; it does not accept images, audio, video, files, or documents.
- The chat displays a message timeline with distinct user and assistant messages.
- The UI shows a pending state while an answer is being prepared and a clear, retryable error when the answer cannot be produced.
- Users can start a new dialogue from a dedicated button; it clears the current dialogue and begins a fresh one.
- The assistant asks a concise follow-up question when the user's request is ambiguous rather than silently making an unexpected assumption.

### FR-2: Flexible transaction analysis

- The assistant answers ad hoc analytical questions about the current user's transactions, rather than being limited to predefined wording or a fixed list of reports.
- It can analyze requested periods, compare periods, identify notable changes, summarize categories or tags, explore merchant spending, and locate relevant transactions.
- Answers state the period or interpretation used whenever that information matters to the result.
- The assistant must base factual statements, values, and visual data on the user's real transaction data. When the available data cannot support an answer, it says so rather than inventing an answer.
- If no relevant data exists, the assistant says so clearly.
- If a request is outside the feature scope, the assistant explains the limitation and, where useful, suggests a supported analytical question.

### FR-3: Visual answers

- The assistant may return a visual representation when it makes an answer easier to understand.
- Supported visual forms include summary values, tables, bar charts, line charts, and category-share charts.
- The Mini App renders visual results in the product’s established visual style and remains usable in Telegram viewport constraints.
- A visual must reflect the same user-scoped data used for the answer.

### FR-4: Safe and read-only behavior

- Chat may read and analyze transaction data only. It must not create, update, delete, categorize, tag, import, export, or otherwise modify Money Track data.
- The backend determines the current user from validated Telegram authentication. The LLM must not receive, choose, or override a user identity.
- Every data-access operation is automatically scoped by backend code to the authenticated user. This rule applies regardless of the wording of the question, chat history, or LLM-generated input.
- A request for another user's data, a guessed identifier, or a prompt-injection attempt must never reveal data or confirm whether that data exists.
- Instructions inside user messages or transaction text are treated as content, not as authorization or execution instructions.

### FR-5: Prohibited SQL operations

The agent is analytical and read-only. If its data-access path uses SQL, it must allow only read-only analytical retrieval and reject commands that can alter data, permissions, database objects, roles, files, or transaction state.

At minimum, the agent must be prohibited from issuing:

- Data-changing commands: `INSERT`, `UPDATE`, `DELETE`, `MERGE`, `TRUNCATE`
- Schema-changing commands: `CREATE`, `ALTER`, `DROP`
- Permission-changing commands: `GRANT`, `REVOKE`
- Execution and file-related commands: `CALL`, `DO`, `EXECUTE`, `COPY`, `LOAD`
- Transaction, role, and session-control commands: `BEGIN`, `COMMIT`, `ROLLBACK`, `SAVEPOINT`, `SET ROLE`, `RESET`, `DISCARD`

This is a product safety requirement. The implementation must enforce it in code; prompting the LLM not to use a command is not sufficient.

## 6) Non-Functional Requirements

### Authorization and security

- Authorization is enforced by backend code, not by LLM instructions or model judgment.
- All answers and visual results are based only on data belonging to the authenticated user.
- The implementation must include automated tests with at least two users to prove that one user's chat cannot retrieve, infer, or affect another user's data.
- The feature must preserve the product’s existing Telegram authentication model.

### Technology and data handling

- Use the OpenAI Agents SDK for LLM orchestration.
- A dialogue lives only while the current AI Chat view is open. It is cleared when the user starts a new dialogue, reloads the app, or navigates away from the view.
- Dialogues are not persisted and cannot be resumed, viewed, or switched to after the current view has ended. Dialogue-passing mechanics are implementation details.

### Observability

- Use the default OpenAI Agents SDK tracing.
- Use the backend logging approach already used by the product.
- Do not introduce a separate observability system or bespoke telemetry model solely for this feature.

## 7) Acceptance Criteria

1. An authenticated user can ask flexible analytical questions about their transaction history and receive a useful answer.
2. The assistant can present transaction analysis as text and, where helpful, as a supported visual form.
3. The assistant asks for clarification when it cannot reliably infer the intended question or period.
4. Chat operations do not alter transactions, categories, tags, or any other Money Track data.
5. The backend, not the LLM, determines the authenticated user and scopes every data-access operation to that user.
6. Automated tests prove that user A cannot access, infer, or change user B's data through normal questions, malformed inputs, guessed identifiers, or prompt-injection attempts.
7. The prohibited SQL operations in FR-5 are rejected by code whenever SQL is used for agent data access.
8. A dialogue is available only during the current AI Chat view and is cleared on a new-dialogue action, app reload, or screen change.
9. Default OpenAI tracing and existing backend logging are available for diagnosing feature behavior.
10. Answers and visuals contain only facts supported by the current user's real transaction data; when data is insufficient, the assistant does not invent an answer.
11. Chat accepts text input only and does not provide multi-modal input controls.

## 8) Resolved Decisions

1. AI Transaction Chat is a read-only analytical feature in its first version.
2. User authorization is always enforced by backend code and must never rely on LLM behavior.
3. The feature uses the OpenAI Agents SDK.
4. Dialogues are limited to the current AI Chat view and do not survive a new-dialogue action, reload, or screen change.
5. The feature uses default OpenAI tracing and the product's existing backend logging.
6. Detailed API contracts, dialogue-passing mechanics, tool design, query design, and database permissions belong to implementation planning, not this PRD.

## 9) References

- [OpenAI Agents SDK documentation](https://openai.github.io/openai-agents-python/)
- [OpenAI Agents SDK source code](https://github.com/openai/openai-agents-python)
