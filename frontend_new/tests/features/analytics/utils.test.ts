import { describe, expect, it } from "vitest";
import { formatMoney, formatSignedMoney, moneyToChartMagnitude } from "@/features/analytics/utils";

describe("analytics money formatting", () => {
  it("formats fixed-scale aggregate money without rounding beyond the safe integer range", () => {
    const value = "9007199254740991.99";
    const normalized = (formatted: string): string => formatted.replace(/\s/g, " ");

    expect(normalized(formatMoney(value, "AED"))).toContain("9,007,199,254,740,991.99");
    expect(normalized(formatSignedMoney(`-${value}`, "AED"))).toContain("-AED 9,007,199,254,740,991.99");
    expect(moneyToChartMagnitude(value)).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("preserves signed zero, decimal cents, and invalid currency fallback", () => {
    expect(formatSignedMoney("-0.00", "AED")).toMatch(/^\+/);
    expect(formatSignedMoney("-0.01", "AED")).toMatch(/^-.*0\.01$/);
    expect(formatMoney("123.45", "invalid")).toBe("invalid 123.45");
    expect(formatSignedMoney("-123.45", "invalid")).toBe("-invalid 123.45");
    expect(formatMoney("1234.50", "USD")).toBe(new Intl.NumberFormat(undefined, {
      style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(1234.5));
  });
});
