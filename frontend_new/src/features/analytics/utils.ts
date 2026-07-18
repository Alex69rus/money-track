import type { AnalyticsDateRange, DecimalMoney } from "@/features/analytics/types";

type MoneyValue = DecimalMoney | number;

interface DecimalParts {
  fraction: string;
  integer: string;
  negative: boolean;
}

const MONEY_VALUE_PATTERN = /^(-?)(\d+)(?:\.(\d+))?$/;
const MAX_CHART_VALUE = BigInt(Number.MAX_SAFE_INTEGER);

function toDecimalParts(value: MoneyValue): DecimalParts {
  const rawValue = typeof value === "number" ? (Number.isFinite(value) ? value.toFixed(2) : "0.00") : value.trim();
  const match = MONEY_VALUE_PATTERN.exec(rawValue);
  if (!match) {
    return { fraction: "00", integer: "0", negative: false };
  }

  const integer = (match[2] ?? "0").replace(/^0+(?=\d)/, "");
  const fraction = (match[3] ?? "").padEnd(2, "0").slice(0, 2);
  const negative = match[1] === "-" && (integer !== "0" || fraction !== "00");
  return { fraction, integer, negative };
}

function decimalPartsToValue(parts: DecimalParts): DecimalMoney {
  return `${parts.negative ? "-" : ""}${parts.integer}.${parts.fraction}`;
}

function asDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}


export function getCurrentMonthDateRange(): AnalyticsDateRange {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    fromDate: asDateKey(start),
    toDate: asDateKey(end),
  };
}

export function getLastDaysDateRange(days: number): AnalyticsDateRange {
  const safeDays = Math.max(1, Math.floor(days));
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - (safeDays - 1));

  return {
    fromDate: asDateKey(start),
    toDate: asDateKey(today),
  };
}

export function formatDateRangeLabel(range: AnalyticsDateRange): string {
  if (!range.fromDate && !range.toDate) {
    return "All time";
  }

  if (!range.fromDate) {
    return `Until ${new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(`${range.toDate}T00:00:00`))}`;
  }

  if (!range.toDate) {
    return `From ${new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(`${range.fromDate}T00:00:00`))}`;
  }

  const from = new Date(`${range.fromDate}T00:00:00`);
  const to = new Date(`${range.toDate}T00:00:00`);

  return `${new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(from)} - ${new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(to)}`;
}

export function formatMoney(value: MoneyValue, currency: string): string {
  const decimal = toDecimalParts(value);
  try {
    const formatter = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const groupedInteger = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(BigInt(decimal.integer));
    return formatter
      .formatToParts(decimal.negative ? -0 : 0)
      .map((part) => {
        if (part.type === "integer") {
          return groupedInteger;
        }
        if (part.type === "fraction") {
          return decimal.fraction;
        }
        return part.value;
      })
      .join("");
  } catch {
    return `${decimal.negative ? "-" : ""}${currency} ${decimal.integer}.${decimal.fraction}`;
  }
}

export function formatSignedMoney(value: MoneyValue, currency: string): string {
  const decimal = toDecimalParts(value);
  const sign = decimal.negative ? "-" : "+";
  return `${sign}${formatMoney(decimalPartsToValue({ ...decimal, negative: false }), currency)}`;
}

export function moneyToChartMagnitude(value: DecimalMoney): number {
  const decimal = toDecimalParts(value);
  const integer = BigInt(decimal.integer);
  if (integer >= MAX_CHART_VALUE) {
    return Number.MAX_SAFE_INTEGER;
  }

  const magnitude = Number(`${decimal.integer}.${decimal.fraction}`);
  return Number.isFinite(magnitude) ? magnitude : Number.MAX_SAFE_INTEGER;
}

export function formatTransactionDateTime(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function toTestIdSegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "")
    .slice(0, 64);
}
