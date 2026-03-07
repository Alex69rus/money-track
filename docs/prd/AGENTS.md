# Backend Migration Preparation Pack

This folder defines the preparation artifacts for migrating backend from C# (`/backend`) to Python (`/backend_new`).

## Documents

- `backend-migration-prd.md`: Product requirements for migration and hard constraints.
- `backend-migration-scaffold-spec.md`: Required project structure and technical scaffolding in `backend_new`.
- `backend-migration-test-strategy.md`: Single integration test strategy for C#-based coverage and Python migration feedback loop.
- `backend-migration-agent-runbook.md`: Execution protocol for AI migration agent.
- `./backend_new/GUARDRAILS.md`: Iteration guardrail log for takeaways, explorations, and prevention rules.

## Core Decision

- New Python backend MUST be implemented in `./backend_new`.
- Existing C# backend in `./backend` MUST remain unchanged and used as baseline for behavior comparison.
