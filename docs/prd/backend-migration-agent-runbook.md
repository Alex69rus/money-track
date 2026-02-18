# AI Agent Runbook: C# -> Python Backend Migration

## 1. Mission

Migrate backend functionality from `/backend` to `/backend_new` with contract parity and zero changes in original backend.

## 2. Inputs

- PRD: `docs/prd/backend-migration-prd.md`
- Scaffold spec: `docs/prd/backend-migration-scaffold-spec.md`
- Test strategy: `docs/prd/backend-migration-test-strategy.md`
- Guardrail log: `./backend_new/GUARDRAILS.md`

## 3. Execution Protocol

Follow iterative loop strictly:

1. Plan
2. Implement in `/backend_new` only
3. Run integration suite against `backend_new`
4. Publish report
5. Continue to next smallest missing slice
6. Append takeaways/exploration/prevention notes to guardrail log

## 4. Change Policy

Allowed edits:
- `./backend_new/**`
- test assets and migration docs under `./docs/prd/**`

Forbidden edits (unless explicitly approved):
- `./backend/**`
- `./frontend/**`
- n8n workflows

## 5. Mandatory Validation per Iteration

- Static checks and tests for `backend_new`.
- Single integration suite execution against `backend_new`.
- Baseline C# execution is needed while designing or extending test scenarios, but not required each iteration.
- Confirm no diff in forbidden folders.

## 6. Stop Conditions

Stop and request human decision when:
- parity gap is ambiguous due to undocumented baseline behavior;
- baseline behavior appears buggy but required for compatibility;
- schema change is needed for correctness.

## 7. Iteration Report Template

- Scope implemented
- Files changed
- Test results (`backend_new` integration run)
- Known deviations
- Risks
- Next step
- Guardrail updates added to `./backend_new/GUARDRAILS.md`

## 8. Completion Gate

Migration can move to cutover planning only when all in-scope parity scenarios are green and no forbidden paths were changed.
