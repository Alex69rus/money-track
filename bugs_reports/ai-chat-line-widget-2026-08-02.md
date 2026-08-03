# AI Chat line-widget findings — 2026-08-02

Scope: AI Chat line-chart response in the Telegram iPhone Mini App and the corresponding widget-tool trace.

This report records observed defects only.

## Evidence

| File | Surface | Highlight |
| --- | --- | --- |
| `ai-chat-line-series-labels-2026-08-02.png` | Telegram iPhone AI Chat | The hover tooltip shows two formatted amounts with no series names, so the user cannot tell which line each amount belongs to. |
| User-supplied `prepare_line_chart_widget` trace | Widget tool | The tool returns the complete prepared payload back to the model, including every line-chart point and money value. |

## BR-021 — AI Chat line chart hides series identities and echoes its payload

Priority: P2

Evidence: `ai-chat-line-series-labels-2026-08-02.png`; user smoke-test report and tool trace.

### Actual

The line-chart tooltip replaces the chart library’s named series rows with bare currency amounts. The widget tool returns its entire validated visual JSON to the LLM after storing it for the user response, needlessly consuming model context.

The current line contract also fixes its two series to `spending` and `income`; the supplied cumulative-balance trace places a balance series in the `income` slot, which would be misleading once a visible `Income` label is restored.

### Expected

Every visible or hovered line value identifies its series. A completed widget tool call confirms only that the visual was added to the user response and never echoes the prepared data. The line-series contract must not mislabel a requested balance series.

### Reproduction

1. Ask AI Chat for a monthly trend with a line chart.
2. Hover a point containing more than one series.
3. Observe values without series names.
4. Inspect the widget-tool trace after the tool succeeds.
5. Observe the complete visual payload returned to the model.

### Acceptance criteria

- A two-series line chart has an accessible visible legend and its tooltip pairs every formatted amount with the corresponding series name.
- The line-widget contract presents a requested balance series with a truthful label; it does not overload an `income` field.
- Every widget tool returns only a short success acknowledgement after storing the visual; it contains no title, period, row, point, amount, or currency from the prepared payload.
- Backend and frontend regressions cover labels, server-provided formatted amounts, and non-echoing tool output.
