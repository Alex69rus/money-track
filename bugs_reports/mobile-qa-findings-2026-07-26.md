# Mobile QA findings — 2026-07-26

Scope: Telegram-hosted AI Chat primary route exercised by the local mobile QA suite.

This report records observed defects only.

## Evidence

| File | Surface | Highlight |
| --- | --- | --- |
| `frontend_new/.codex-tmp/mobile-qa/2026-07-26T18-09-34-283Z/dark/iphone-se/failure.png` | AI Chat on iPhone SE, dark theme | The page begins above the required 96 px Telegram service-control clearance. |
| `frontend_new/.codex-tmp/mobile-qa/2026-07-26T18-09-34-283Z/light/iphone-se/failure.png` | AI Chat on iPhone SE, light theme | The same top-inset failure occurs in light theme. |

## BR-008 — AI Chat intrudes into Telegram top service-control inset on iPhone SE

Priority: P2

Evidence: `frontend_new/.codex-tmp/mobile-qa/2026-07-26T18-09-34-283Z/dark/iphone-se/failure.png`; `scripts/run_frontend_mobile_qa.sh` output on 2026-07-26.

### Actual

On the 375×667 iPhone SE profile with a 24 px Telegram content-safe inset, the AI Chat primary page begins at y=83–92 px. The mobile suite requires at least 96 px to clear Telegram service controls.

### Expected

Every Telegram primary route, including AI Chat, begins at or below `max(contentSafeAreaInset.top, 5rem) + 1rem` and is not obscured by Telegram controls.

### Reproduction

1. Run `QA_BACKEND_PORT=8004 QA_FRONTEND_PORT=4176 bash scripts/run_frontend_mobile_qa.sh`.
2. Let the suite navigate to AI Chat on the iPhone SE profile in dark or light mode.
3. Observe the `AI Chat primary page` top-inset assertion fail.

### Acceptance criteria

- AI Chat begins at y≥96 px in the iPhone SE Telegram fixture in both themes.
- All existing larger iPhone profiles remain within their Telegram safe areas.
- The full mobile QA suite passes without relaxing its visible top-inset assertion.
