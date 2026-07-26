import { ApiRequestError, apiRequest } from "@/services/api/client";

const CHAT_ENDPOINT = "/api/chat";
const DECIMAL_PATTERN = /^-?\d+(?:\.\d+)?$/;
const SUMMARY_METRIC_KEYS = [
  "balance",
  "change",
  "change_percent",
  "current_period",
  "income",
  "previous_period",
  "spending",
  "transaction_count",
] as const;

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

export interface ChatSummaryVisual {
  kind: "summary";
  metrics: Array<{
    count: number | null;
    key: string;
    label: string;
    money: ChatMoney | null;
    percentage: ChatPercentage | null;
  }>;
  period: ChatPeriod;
  title: string;
}

export interface ChatTransactionsTableVisual {
  kind: "table";
  period: ChatPeriod;
  rows: Array<{
    amount: ChatMoney;
    category: string | null;
    dateTime: string;
    id: number;
    note: string | null;
    tags: string[];
  }>;
  tableKind: "transactions";
  title: string;
}

export interface ChatBreakdownTableVisual {
  kind: "table";
  period: ChatPeriod;
  rows: Array<{ label: string; value: ChatMoney }>;
  tableKind: "breakdown";
  title: string;
}

export interface ChatComparisonTableVisual {
  kind: "table";
  period: ChatPeriod;
  rows: Array<{
    change: ChatMoney;
    changePercent: ChatPercentage | null;
    current: ChatMoney;
    label: string;
    previous: ChatMoney;
  }>;
  tableKind: "comparison";
  title: string;
}

export interface ChatBarVisual {
  items: Array<{ label: string; value: ChatMoney }>;
  kind: "bar";
  measure: "balance" | "change" | "income" | "spending";
  period: ChatPeriod;
  title: string;
}

export interface ChatLineVisual {
  kind: "line";
  period: ChatPeriod;
  points: Array<{ bucket: string; income: ChatMoney; label: string; spending: ChatMoney }>;
  title: string;
}

export interface ChatCategoryShareVisual {
  dimension: "category" | "tag";
  items: Array<{ label: string; share: ChatPercentage; value: ChatMoney }>;
  kind: "category_share";
  period: ChatPeriod;
  title: string;
}

export type ChatVisual =
  | ChatBarVisual
  | ChatBreakdownTableVisual
  | ChatCategoryShareVisual
  | ChatComparisonTableVisual
  | ChatLineVisual
  | ChatSummaryVisual
  | ChatTransactionsTableVisual;

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

  if (visual.kind === "summary" && Array.isArray(visual.metrics) && visual.metrics.length >= 2 && visual.metrics.length <= 4) {
    const valid = visual.metrics.every((metric) => {
      const item = asRecord(metric);
      return (
        item !== null &&
        isString(item.key) &&
        SUMMARY_METRIC_KEYS.includes(item.key as (typeof SUMMARY_METRIC_KEYS)[number]) &&
        isString(item.label) &&
        (item.money === null || isMoney(item.money)) &&
        (item.percentage === null || isPercentage(item.percentage)) &&
        (item.count === null || (typeof item.count === "number" && Number.isInteger(item.count) && item.count >= 0))
      );
    });
    return valid ? (visual as unknown as ChatSummaryVisual) : null;
  }

  if (
    visual.kind === "bar" &&
    Array.isArray(visual.items) &&
    visual.items.length >= 1 &&
    visual.items.length <= 10 &&
    ["balance", "change", "income", "spending"].includes(String(visual.measure))
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
        isString(row.bucket) &&
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
    visual.kind === "category_share" &&
    Array.isArray(visual.items) &&
    visual.items.length >= 1 &&
    visual.items.length <= 10 &&
    ["category", "tag"].includes(String(visual.dimension))
  ) {
    const valid = visual.items.every((item) => {
      const row = asRecord(item);
      return row !== null && isString(row.label) && isMoney(row.value) && hasFiniteChartAmount(row.value) && isPercentage(row.share);
    });
    return valid ? (visual as unknown as ChatCategoryShareVisual) : null;
  }

  if (
    visual.kind === "table" &&
    isString(visual.tableKind) &&
    Array.isArray(visual.rows) &&
    visual.rows.length >= 1 &&
    visual.rows.length <= 20
  ) {
    if (visual.tableKind === "transactions") {
      const valid = visual.rows.every((item) => {
        const row = asRecord(item);
        return (
          row !== null &&
          typeof row.id === "number" &&
          Number.isInteger(row.id) &&
          isString(row.dateTime) &&
          isNullableString(row.category) &&
          isNullableString(row.note) &&
          Array.isArray(row.tags) &&
          row.tags.every(isString) &&
          isMoney(row.amount)
        );
      });
      return valid ? (visual as unknown as ChatTransactionsTableVisual) : null;
    }
    if (visual.tableKind === "breakdown") {
      if (visual.rows.length > 10) {
        return null;
      }
      const valid = visual.rows.every((item) => {
        const row = asRecord(item);
        return row !== null && isString(row.label) && isMoney(row.value);
      });
      return valid ? (visual as unknown as ChatBreakdownTableVisual) : null;
    }
    if (visual.tableKind === "comparison") {
      if (visual.rows.length > 10) {
        return null;
      }
      const valid = visual.rows.every((item) => {
        const row = asRecord(item);
        return (
          row !== null &&
          isString(row.label) &&
          isMoney(row.current) &&
          isMoney(row.previous) &&
          isMoney(row.change) &&
          (row.changePercent === null || isPercentage(row.changePercent))
        );
      });
      return valid ? (visual as unknown as ChatComparisonTableVisual) : null;
    }
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
