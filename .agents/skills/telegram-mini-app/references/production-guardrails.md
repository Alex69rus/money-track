# Production Guardrails

Use this file for release hardening after core Mini App functionality is working.

## 1. Lifecycle Guardrails

- Call `ready()` only after the critical initial UI is rendered.
- Use `expand()` only when full-height UX is expected.
- Register WebApp events in framework lifecycle hooks and always unregister on cleanup.

Checklist:

1. `ready()` called once per app mount.
2. No event handler leaks after route/page transitions.
3. No unsupported method calls without version checks.

## 2. Unsafe Data Boundaries

- Use `initDataUnsafe` only for non-sensitive client rendering hints.
- Use backend-validated `initData` for identity, authorization, and write actions.
- Reject stale sessions by enforcing `auth_date` max age.

Never:

1. Trust `user.id` from `initDataUnsafe` for privileged APIs.
2. Issue long-lived sessions without periodic revalidation.

## 3. Navigation and Viewport Ownership

- Keep one route-aware owner for `BackButton` visibility, click binding, and cleanup.
- Reserve product-measured native host-control clearance in the shared page shell; apply it to primary routes and fixed full-page overlays instead of local page margins.
- Size bottom-pinned controls from `viewportStableHeight` and safe-area insets. Keep one intended scroll owner with matching `scroll-padding` so focused inputs remain reachable above the keyboard.
- Treat fullscreen and vertical-swipe calls as version-gated host requests. Preserve normal-host behavior when unsupported, declined, or exited.

Never:

1. Reimplement Telegram Close/Back chrome inside a nested route.
2. Treat a browser fixture as proof of native Telegram header or keyboard behavior.
3. Use `100vh` as the sole geometry source for fixed actions in a Telegram WebView.

## 4. Closing Behavior

Use closing confirmation for destructive exits only:

1. Enable confirmation when form/edit state becomes dirty.
2. Disable confirmation after successful save, explicit discard, or reset.
3. Avoid global always-on confirmation, which degrades UX.

Pattern:

1. Dirty state enters `true` -> enable closing confirmation.
2. Dirty state returns `false` -> disable closing confirmation.

## 5. Deep-Link and URL Safety

- Treat `start_param` as untrusted user input.
- Allowlist expected formats (`campaign_x`, UUID-like token, etc.) server-side.
- Reject malformed or overlong params early.
- Use `openTelegramLink` only for Telegram URLs and `openLink` only for vetted HTTP(S) URLs.

Checklist:

1. `start_param` parser has strict schema validation.
2. Unexpected params are logged and ignored (not executed).
3. Outbound URLs are validated before open methods are called.

## 6. Minimal Observability Contract

Log only what is needed for debugging and incident triage.

Log fields per session/action:

1. `platform`
2. `version`
3. launch mode (`keyboard`, `inline`, `menu`, `direct`, `attachment`)
4. `start_param` presence (value may be masked/truncated)
5. auth validation result (`ok` / failure reason category)
6. key method failures (`method`, `unsupported_version`, `invalid_context`)

Do not log:

1. raw `initData`
2. bot token
3. full personally identifying payloads unless explicitly required and compliant
