import { ApiRequestError, apiRequest } from "@/services/api/client";

const CHAT_ENDPOINT = "/api/chat";
const DECIMAL_PATTERN = /^-?\d+(?:\.\d+)?$/;

export interface ChatHistoryMessage {
  content: string;
  role: "assistant" | "user";
}

export interface ChatRequestPayload {
  history: ChatHistoryMessage[];
  message: string;
}

export interface ChatChartValue {
  display: string;
  value: string;
}

export interface ChatChartSeriesValue {
  label: string;
  value: ChatChartValue;
}

export interface ChatPeriod {
  fromDate: string | null;
  label: string;
  toDate: string | null;
}

export interface ChatTableVisual {
  kind: "table";
  period: ChatPeriod;
  columns: string[];
  rows: string[][];
  title: string;
}

export interface ChatBarVisual {
  items: Array<{ label: string; values: ChatChartSeriesValue[] }>;
  kind: "bar";
  period: ChatPeriod;
  title: string;
}

export interface ChatLineVisual {
  kind: "line";
  period: ChatPeriod;
  points: Array<{ label: string; values: ChatChartSeriesValue[] }>;
  title: string;
}

export interface ChatPieVisual {
  items: Array<{ label: string; share: ChatChartValue; value: ChatChartValue }>;
  kind: "pie";
  period: ChatPeriod;
  title: string;
}

export type ChatVisual =
  | ChatBarVisual
  | ChatLineVisual
  | ChatPieVisual
  | ChatTableVisual;

export interface ChatResponse {
  kind: "answer" | "clarification" | "limitation";
  message: string;
  version: "v1";
  visual: ChatVisual | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isChartValue(value: unknown): value is ChatChartValue {
  const item = asRecord(value);
  return (
    item !== null &&
    isString(item.value) &&
    DECIMAL_PATTERN.test(item.value) &&
    isString(item.display)
  );
}

function hasFiniteChartValue(value: ChatChartValue): boolean {
  return Number.isFinite(Number(value.value));
}

function isPeriod(value: unknown): value is ChatPeriod {
  const item = asRecord(value);
  return item !== null && isString(item.label) && isNullableString(item.fromDate) && isNullableString(item.toDate);
}

function chartSeriesNames(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const seriesNames = value.map((item) => {
    const series = asRecord(item);
    return series !== null && isString(series.label) && isChartValue(series.value) && hasFiniteChartValue(series.value)
      ? series.label
      : null;
  });
  if (seriesNames.some((name) => name === null)) {
    return null;
  }

  const names = seriesNames as string[];
  return new Set(names).size === names.length ? names.sort() : null;
}

export function parseChatVisual(value: unknown): ChatVisual | null {
  const visual = asRecord(value);
  if (!visual || !isString(visual.kind) || !isString(visual.title) || !isPeriod(visual.period)) {
    return null;
  }

  if (visual.kind === "bar" && Array.isArray(visual.items) && visual.items.length >= 1) {
    const firstItem = asRecord(visual.items[0]);
    const expectedSeriesNames = firstItem === null ? null : chartSeriesNames(firstItem.values);
    const valid =
      expectedSeriesNames !== null &&
      visual.items.every((item) => {
        const row = asRecord(item);
        const seriesNames = row === null ? null : chartSeriesNames(row.values);
        return row !== null && isString(row.label) && seriesNames !== null && seriesNames.join("\u0000") === expectedSeriesNames.join("\u0000");
      });
    return valid ? (visual as unknown as ChatBarVisual) : null;
  }

  if (visual.kind === "line" && Array.isArray(visual.points) && visual.points.length >= 2) {
    const firstPoint = asRecord(visual.points[0]);
    const expectedSeriesNames = firstPoint === null ? null : chartSeriesNames(firstPoint.values);
    const valid =
      expectedSeriesNames !== null &&
      visual.points.every((point) => {
        const row = asRecord(point);
        const seriesNames = row === null ? null : chartSeriesNames(row.values);
        return row !== null && isString(row.label) && seriesNames !== null && seriesNames.join("\u0000") === expectedSeriesNames.join("\u0000");
      });
    return valid ? (visual as unknown as ChatLineVisual) : null;
  }

  if (
    visual.kind === "pie" &&
    Array.isArray(visual.items) &&
    visual.items.length >= 1 &&
    visual.items.length <= 10
  ) {
    const valid = visual.items.every((item) => {
      const row = asRecord(item);
      return row !== null && isString(row.label) && isChartValue(row.value) && hasFiniteChartValue(row.value) && isChartValue(row.share) && hasFiniteChartValue(row.share);
    });
    return valid ? (visual as unknown as ChatPieVisual) : null;
  }

  const columns = visual.columns;
  const rows = visual.rows;
  if (
    visual.kind === "table" &&
    Array.isArray(columns) &&
    columns.length >= 1 &&
    columns.length <= 8 &&
    columns.every(isString) &&
    Array.isArray(rows) &&
    rows.length >= 1 &&
    rows.length <= 20
  ) {
    const valid = rows.every(
      (row) => Array.isArray(row) && row.length === columns.length && row.every(isString),
    );
    return valid ? (visual as unknown as ChatTableVisual) : null;
  }

  return null;
}

function parseChatResponse(payload: unknown): ChatResponse | null {
  const response = asRecord(payload);
  if (
    !response ||
    response.version !== "v1" ||
    !isString(response.message) ||
    !["answer", "clarification", "limitation"].includes(String(response.kind)) ||
    !(response.visual === null || parseChatVisual(response.visual))
  ) {
    return null;
  }

  return response as unknown as ChatResponse;
}

export async function sendChatMessage(payload: ChatRequestPayload, signal?: AbortSignal): Promise<ChatResponse> {
  const responsePayload = await apiRequest<unknown>(CHAT_ENDPOINT, {
    body: JSON.stringify(payload),
    method: "POST",
    signal,
  });
  const response = parseChatResponse(responsePayload);
  if (!response) {
    throw new ApiRequestError("AI chat returned an invalid response. Please try again.", 502);
  }
  return response;
}
