# Backend Migration Test Strategy (Parity First)

## 1. Objective

Create one integration suite based on C# backend behavior and use it as the feedback loop for Python migration.

## 2. Test Layers

- Integration tests: HTTP status, payload, validation, error bodies.
- Data integrity tests: key DB constraints and side effects.
- Auth tests: development bypass and unauthorized behavior.

Single-suite rule:
- Maintain one integration suite only in `backend_new/tests/integration`.
- During test authoring, validate scenarios against C# backend behavior.
- After the suite is stable and green on C#, run the same suite against Python backend during development.
- Ongoing C# vs Python result-file comparison is not required.

## 3. Baseline and Candidate

- Baseline: `./backend`
- Candidate: `./backend_new`

Both must be validated against same fixtures and expected outcomes.

## 4. Priority Scenarios

1. `GET /health` returns expected success.
2. `GET /api/categories` sorted by `order_index`, then `name`.
3. `GET /api/tags` returns distinct sorted tags for current user.
4. `GET /api/transactions` default pagination semantics (`skip=0`, `take=50`, `hasMore`).
5. Date filters include full `toDate` day boundary.
6. Tag and text search behavior parity.
7. `POST /api/transactions` creates row with expected defaults and UTC handling.
8. `PUT /api/transactions/{id}` enforces ownership and updates fields.
9. `DELETE /api/transactions/{id}` enforces ownership and removes row.
10. Unauthorized response shape for invalid/missing auth in non-development mode.
11. Unique constraint behavior for `(user_id, message_id)`.
12. Category FK behavior (`SET NULL`) on category deletion operations.

## 5. Test Data Rules

- Use fixed timestamps and static IDs where possible.
- Use explicit user IDs to validate ownership boundaries.
- Keep fixture dataset minimal but covering all branches.
- Avoid random data in parity tests.

## 6. Pass/Fail Policy

- Any mismatch in status code, required field, value semantics, or DB side effects is a failure.
- Tests cannot be altered to accommodate candidate implementation differences without PRD update.

## 7. Reporting Format

Per run, produce:
- Passed/failed counts.
- Endpoint scenario failures.
- Payload diff summary.
- DB invariant failures.
- Guardrail entry updates in `./backend_new/GUARDRAILS.md` when new pitfalls or reliable patterns are discovered.
