# Security and Auth

Use this file whenever authentication, user identity, or session integrity is involved.

## Non-Negotiable Rules

- Never authorize users from `initDataUnsafe` alone.
- Validate raw `initData` on backend for every privileged request.
- Enforce replay window using `auth_date`.
- Bind session to validated Telegram user id.

## Validation Algorithm (Bot Token)

Input: raw query string from `Telegram.WebApp.initData`.

1. Parse key-value pairs.
2. Extract `hash`.
3. Build `data_check_string` from all other fields sorted alphabetically:
- format: `key=<value>`
- separator: line feed (`\n`).
4. Compute `secret_key = HMAC_SHA256(key="WebAppData", data=<bot_token>)`.
5. Compute `candidate_hash = HMAC_SHA256(key=secret_key, data=data_check_string)` (hex lowercase).
6. Accept only if `candidate_hash == hash`.
7. Check `auth_date` freshness (for example, max age 5-15 minutes for sensitive actions).

## Python Example

```python
import hashlib
import hmac
import time
from urllib.parse import parse_qsl


def validate_telegram_init_data(init_data: str, bot_token: str, max_age_sec: int = 900) -> dict:
    pairs = dict(parse_qsl(init_data, keep_blank_values=True))
    their_hash = pairs.pop("hash", None)
    if not their_hash:
        raise ValueError("Missing hash")

    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(pairs.items()))
    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    calc_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(calc_hash, their_hash):
        raise ValueError("Invalid hash")

    auth_date = int(pairs.get("auth_date", "0"))
    if auth_date <= 0 or time.time() - auth_date > max_age_sec:
        raise ValueError("Expired auth_date")

    return pairs
```

## Third-Party Validation

For third parties that must verify Mini App data without bot token:

- Use `signature` verification flow with Telegram Ed25519 public keys.
- Build signed string as `<bot_id>:WebAppData\n` + sorted `key=value` lines excluding `hash` and `signature`.
- Verify base64url signature against Telegram key.

Use this only when bot-token-based verification cannot be used.

## Backend Contract

Return minimal user/session envelope to frontend after validation, e.g.:

- `telegram_user_id`
- `username` (optional)
- `language_code` (optional)
- `chat_instance` (if present)
- internal session token

Never return bot token or signature internals to client.
