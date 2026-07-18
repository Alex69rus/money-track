# `frontend_new`

The production Telegram Mini App frontend. Future work is an approved feature, defect, or verification slice.

## Current status

- The released navigation, transaction, analytics, chat, and settings flows are documented in the frontend PRD.
- Browser and Telegram-fixture verification cover the supported flows. Real Telegram iPhone verification remains pending until `TELEGRAM_DEVICE_NGROK_DOMAIN` is configured.
- Deferred backend work—only when separately approved—is a stable `/api/chat` schema.

## Daily commands

From `frontend_new`:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

From the repository root, run the phase gate that matches the changed contract:

```bash
npm run qa:phase2
npm run qa:phase3
npm run qa:phase4
npm run qa:phase5
```

For layout, sheet, input, or Telegram-viewport work:

```bash
scripts/run_frontend_mobile_qa.sh
```

Root QA runners own a fresh local stack by default. Reuse an existing backend/frontend pair only when it is intentional and CORS-compatible:

```bash
QA_REUSE_SERVICES=1 scripts/run_frontend_phase_qa.sh phase3
```

On this macOS workspace, browser QA must be run with the desktop runner's elevated local-process permission; the sandbox cannot launch Chromium.

The stack lifecycle decision matrix is covered by:

```bash
scripts/test_frontend_qa_stack.sh
```

For a physical Telegram iPhone check once the reserved test-bot domain is available:

```bash
cd frontend_new
TELEGRAM_DEVICE_NGROK_DOMAIN=your-reserved-domain.ngrok-free.app npm run qa:telegram-device
```

## Documentation

- `AGENTS.MD`: operating rules for frontend changes
- `GUARDRAILS.md`: compact, reusable implementation lessons
- `../docs/frontend-prd/`: current product requirements and user-flow contract
- `docs/decisions.md`: locked product decisions
- `docs/telegram-mini-app-playbook.md`: Telegram lifecycle and navigation contract
- `docs/api-evolution-plan.md`: current frontend/API boundary
- `docs/qa-acceptance-checklist.md`: change-based QA checklist
- `../docs/tasklist.md`: the single task and status register
