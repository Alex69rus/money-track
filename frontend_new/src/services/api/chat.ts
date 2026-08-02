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

export interface ChatMoney {
  amount: string;
  currency: string;
  display: string;
}

export interface ChatPercentage {
  display: string;
  value: string;
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
  items: Array<{ label: string; value: ChatMoney }>;
  kind: "bar";
  period: ChatPeriod;
  title: string;
}

export interface ChatLineVisual {
  kind: "line";
  period: ChatPeriod;
  points: Array<{ income: ChatMoney; label: string; spending: ChatMoney }>;
  title: string;
}

export interface ChatPieVisual {
  items: Array<{ label: string; share: ChatPercentage; value: ChatMoney }>;
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

function isMoney(value: unknown): value is ChatMoney {
  const item = asRecord(value);
  return (
    item !== null &&
    isString(item.amount) &&
    DECIMAL_PATTERN.test(item.amount) &&
    isString(item.currency) &&
    isString(item.display)
  );
}

function isPercentage(value: unknown): value is ChatPercentage {
  const item = asRecord(value);
  return item !== null && isString(item.value) && DECIMAL_PATTERN.test(item.value) && isString(item.display);
}

function hasFiniteChartAmount(value: ChatMoney): boolean {
  return Number.isFinite(Number(value.amount));
}

function isPeriod(value: unknown): value is ChatPeriod {
  const item = asRecord(value);
  return item !== null && isString(item.label) && isNullableString(item.fromDate) && isNullableString(item.toDate);
}

function parseVisual(value: unknown): ChatVisual | null {
  const visual = asRecord(value);
  if (!visual || !isString(visual.kind) || !isString(visual.title) || !isPeriod(visual.period)) {
    return null;
  }

  if (
    visual.kind === "bar" &&
    Array.isArray(visual.items) &&
    visual.items.length >= 1 &&
    visual.items.length <= 10
  ) {
    const valid = visual.items.every((item) => {
      const row = asRecord(item);
      return row !== null && isString(row.label) && isMoney(row.value) && hasFiniteChartAmount(row.value);
    });
    return valid ? (visual as unknown as ChatBarVisual) : null;
  }

  if (visual.kind === "line" && Array.isArray(visual.points) && visual.points.length >= 2 && visual.points.length <= 12) {
    const valid = visual.points.length >= 2 && visual.points.every((point) => {
      const row = asRecord(point);
      return (
        row !== null &&
        isString(row.label) &&
        isMoney(row.spending) &&
        hasFiniteChartAmount(row.spending) &&
        isMoney(row.income) &&
        hasFiniteChartAmount(row.income)
      );
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
      return row !== null && isString(row.label) && isMoney(row.value) && hasFiniteChartAmount(row.value) && isPercentage(row.share);
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
    !(response.visual === null || parseVisual(response.visual))
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
