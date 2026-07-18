import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchCategoryBreakdown,
  fetchMonthlyBreakdown,
  fetchTagBreakdown,
  fetchTransactionSummary,
} from "@/services/api/analytics";

describe("analytics API resources", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("requests each focused resource without a currency query parameter", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ totalIncome: "12.00", totalExpenses: "2.50", balance: "9.50", transactionCount: 3 }), { headers: { "content-type": "application/json" } }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [{ categoryId: 7, categoryName: "Food", categoryIcon: "restaurant", categoryColor: "#2d8cff", amount: "2.50", transactionCount: 1, share: 1 }] }), { headers: { "content-type": "application/json" } }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [{ tag: "coffee", amount: "2.50", transactionCount: 1, share: 1 }] }), { headers: { "content-type": "application/json" } }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [{ month: "2026-07", income: "12.00", expenses: "2.50", balance: "9.50" }] }), { headers: { "content-type": "application/json" } }),
      );
    global.fetch = fetchMock as unknown as typeof fetch;
    const range = { fromDate: "2026-07-01", toDate: "2026-07-31" };

    await expect(fetchTransactionSummary(range)).resolves.toMatchObject({ balance: "9.50", transactionCount: 3 });
    await expect(fetchCategoryBreakdown(range)).resolves.toMatchObject([{ key: "category-7", amount: "2.50" }]);
    await expect(fetchTagBreakdown(range)).resolves.toMatchObject([{ key: "coffee", amount: "2.50" }]);
    await expect(fetchMonthlyBreakdown(range)).resolves.toMatchObject([{ key: "2026-07", balance: "9.50" }]);

    expect(fetchMock.mock.calls.map(([input]) => String(input))).toEqual([
      "/api/transactions/summary?fromDate=2026-07-01&toDate=2026-07-31",
      "/api/transactions/by-categories?fromDate=2026-07-01&toDate=2026-07-31",
      "/api/transactions/by-tags?fromDate=2026-07-01&toDate=2026-07-31",
      "/api/transactions/by-months?fromDate=2026-07-01&toDate=2026-07-31",
    ]);
  });

  it("preserves a fixed-scale amount beyond JavaScript's safe integer range", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          totalIncome: "9007199254740991.99",
          totalExpenses: "0.00",
          balance: "9007199254740991.99",
          transactionCount: 1,
        }),
        { headers: { "content-type": "application/json" } },
      ),
    ) as unknown as typeof fetch;

    await expect(fetchTransactionSummary({ fromDate: "2026-07-01", toDate: "2026-07-31" })).resolves.toMatchObject({
      balance: "9007199254740991.99",
      totalIncome: "9007199254740991.99",
    });
  });
});
