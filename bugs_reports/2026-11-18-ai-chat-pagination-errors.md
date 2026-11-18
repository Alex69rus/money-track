# AI Chat pagination errors — 2026-11-18

## BR-030 — Pagination errors omit the invalid argument

Priority P2. Evidence comes from the backend integration suite. The same failures reproduced on the baseline checkout before database tracing was added.

### Actual

The aggregate, transaction list, and tag tools return the SDK's generic failure message for invalid pagination.

### Expected

The tool response identifies the invalid `skip` or `take` field so the model can correct its next call.

### Reproduction

Call the aggregate tool with `take=101`, the transaction list tool with `take=-1`, and the tags tool with `skip=-1`.

### Acceptance criteria

- Each call identifies the invalid field and its allowed range.
- Pagination bounds are enforced before a database query.
- Error feedback contains only fixed field guidance and omits argument values and exception details.
