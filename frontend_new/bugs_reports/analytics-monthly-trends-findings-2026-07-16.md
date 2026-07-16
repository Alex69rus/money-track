# Analytics Monthly Trends findings — 2026-07-16

Scope: Analytics date-range filtering and the Monthly Trends chart in the shipped React frontend.

## Evidence

| File | Surface | Highlight |
| --- | --- | --- |
| `temp.md` | Analytics → Monthly Trends | User report: a January 1–July 31 filter omits January from the displayed months. |
| `frontend_new/src/features/analytics/utils.ts` | Analytics model | The sorted trend buckets are limited to the last six items. |

## BR-019 — Monthly Trends omits the earliest month in a seven-month range

Priority: P2

Evidence: `temp.md`; `frontend_new/src/features/analytics/utils.ts`.

### Actual

With transactions across January through July and an active January 1–July 31 date range, Monthly Trends shows February through July and omits January.

### Expected

Monthly Trends displays every month with transactions in the active date range, in chronological left-to-right order. The chart may use its existing horizontal scrolling when more months are present.

### Reproduction

1. Have at least one transaction in each month from January through July.
2. In Analytics, set the range from January 1 to July 31 of that year.
3. Inspect Monthly Trends.
4. Observe that January is absent.

### Acceptance criteria

- A seven-month range with January through July transactions shows all seven month buckets, including January.
- The buckets remain chronological from earliest to latest.
- Existing selected-month disclosure and chart scrolling remain usable.
