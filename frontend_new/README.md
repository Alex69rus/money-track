# `frontend_new`

The current Telegram Mini App frontend. The redesign is complete; future work is an approved feature, defect, or verification slice, not a new visual-alignment program.

## Current status

- Functional phases 0–5, visual alignment, and planned BFX fixes are complete.
- Browser and Telegram-fixture verification cover the supported flows. Real Telegram iPhone verification remains pending until `TELEGRAM_DEVICE_NGROK_DOMAIN` is configured.
- Deferred backend work—only when separately approved—is a stable `/api/chat` schema and server-side analytics aggregation.

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

For a physical Telegram iPhone check once the reserved test-bot domain is available:

```bash
cd frontend_new
TELEGRAM_DEVICE_NGROK_DOMAIN=your-reserved-domain.ngrok-free.app npm run qa:telegram-device
```

## Documentation

- `AGENTS.MD`: operating rules for frontend changes
- `GUARDRAILS.md`: compact, reusable implementation lessons
- `docs/decisions.md`: locked product decisions
- `docs/telegram-mini-app-playbook.md`: Telegram lifecycle and navigation contract
- `docs/api-evolution-plan.md`: current frontend/API boundary
- `docs/qa-acceptance-checklist.md`: change-based QA checklist
- `../docs/tasklist.md`: the single task and status register
- `docs/frontend-redesign-requirements/`: functional requirements and user flows
