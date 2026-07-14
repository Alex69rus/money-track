# Launch Modes

Use this file when choosing how the Mini App opens and how data/messages return to the bot.

## Mode Matrix

1. Keyboard button (`KeyboardButton.web_app`)
- Best for compact form input and quick structured submissions.
- Can call `Telegram.WebApp.sendData(data)`.
- `sendData` closes the app and sends `web_app_data` service message to bot.
- Payload limit: 4096 bytes.

2. Inline keyboard button (`InlineKeyboardButton.web_app`)
- Best for richer personalized experiences.
- Provides session context including `query_id`.
- Bot can call `answerWebAppQuery(query_id, result)` to send message on behalf of user.

3. Menu button launch
- Operationally similar to inline-button launch.
- Configured in BotFather (`/setmenubutton`).

4. Main Mini App (`https://t.me/<bot>?startapp=...`)
- Openable from bot profile and direct links.
- Supports `startapp` parameter and compact/fullscreen behavior.
- Receives `start_param` and URL GET param `tgWebAppStartParam`.

5. Inline mode launch (`InlineQueryResultsButton`)
- Opens Mini App from inline mode context.
- Cannot directly read/send chat messages.
- Use `switchInlineQuery` to return user into inline result send flow.

6. Direct link Mini App (`https://t.me/<bot>/<appname>?startapp=...`)
- Can carry chat context via `chat_type` and `chat_instance`.
- No direct chat write; use inline handoff for sending.
- Can include `mode=compact` to open half-height by default.

7. Attachment menu launch
- Supports rich context (`receiver`/`chat` depending on chat type).
- Supports `startattach`, propagated to `start_param` and `tgWebAppStartParam`.
- Supports choose-chat links (`choose=users+bots+groups+channels`).

## Selection Heuristics

- Need one-shot structured data return without backend mediation: choose keyboard button + `sendData`.
- Need rich UI and response message authored via bot on user behalf: choose inline/menu/attachment + `answerWebAppQuery`.
- Need shareable deep link entry: choose direct link or main Mini App link with `startapp`.
- Need cross-chat inline creation flow: choose inline mode + `switchInlineQuery`.

## Parameters to Preserve

Preserve and log (server-side, sanitized):

- `query_id`
- `start_param`
- `chat_type`
- `chat_instance`
- `auth_date`

Use these values for routing, attribution, and replay-window checks.
