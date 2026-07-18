import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError } from "@/services/api/client";
import { getFallbackModeState, resetFallbackModeForTests } from "@/services/api/fallback-mode";
import { listTransactions } from "@/services/api/transactions";

describe("listTransactions fallback behavior", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    resetFallbackModeForTests();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
    resetFallbackModeForTests();
  });

  it("returns controlled fallback data on network-unreachable errors", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await listTransactions({ skip: 0, take: 50 });
    const fallbackState = getFallbackModeState();

    expect(result.data.length).toBeGreaterThan(0);
    expect(result.totalCount).toBeGreaterThan(0);
    expect(fallbackState.active).toBe(true);
  });

  it("does not fallback for backend 5xx responses", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("upstream unavailable", { status: 500 }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(listTransactions({ skip: 0, take: 50 })).rejects.toBeInstanceOf(ApiRequestError);
    expect(getFallbackModeState().active).toBe(false);
  });

  it("serializes the server-owned calculation-currency drilldown filters without a currency value", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [], totalCount: 0, skip: 0, take: 50, hasMore: false }), {
        headers: { "content-type": "application/json" },
      }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    await listTransactions({
      fromDate: "2026-07-01",
      toDate: "2026-07-31",
      flow: "expense",
      tag: "coffee",
      calculationCurrencyOnly: true,
      skip: 0,
      take: 50,
    });

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "/api/transactions?skip=0&take=50&fromDate=2026-07-01&toDate=2026-07-31&tag=coffee&flow=expense&calculationCurrencyOnly=true",
    );
  });
});
