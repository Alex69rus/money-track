import { afterEach, describe, expect, it, vi } from "vitest";
import { sendChatMessage } from "@/services/api/chat";

function answer(visual: object | null): Response {
  return new Response(JSON.stringify({ kind: "answer", message: "Agent-authored answer.", version: "v1", visual }), {
    headers: { "Content-Type": "application/json" },
  });
}

describe("AI Chat API contract", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("sends only the typed message and in-view history", async () => {
    const fetchMock = vi.fn().mockResolvedValue(answer(null));
    global.fetch = fetchMock as unknown as typeof fetch;

    await sendChatMessage({
      history: [{ content: "Earlier question", role: "user" }],
      message: "Current question",
    });

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    if (typeof options.body !== "string") {
      throw new Error("Expected the AI Chat request body to be JSON text.");
    }
    expect(JSON.parse(options.body)).toEqual({
      history: [{ content: "Earlier question", role: "user" }],
      message: "Current question",
    });
  });

  it("rejects a malformed visual instead of rendering invented chart data", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      answer({
        items: [{ label: "Food", value: { amount: "not-a-number", currency: "AED", display: "AED 50" } }],
        kind: "bar",
        period: { fromDate: "2099-01-01", label: "January", toDate: "2099-01-31" },
        title: "Spending by category",
      }),
    ) as unknown as typeof fetch;

    await expect(sendChatMessage({ history: [], message: "Show spending" })).rejects.toMatchObject({
      status: 502,
    });
  });

  it("accepts a free-form table", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      answer({
        kind: "table",
        columns: ["Month", "Difference"],
        period: { fromDate: "2099-01-01", label: "January 2099", toDate: "2099-01-31" },
        rows: [["January", "AED 50.00"]],
        title: "Monthly difference",
      }),
    ) as unknown as typeof fetch;

    await expect(sendChatMessage({ history: [], message: "Show the difference" })).resolves.toMatchObject({
      visual: {
        columns: ["Month", "Difference"],
        kind: "table",
        rows: [["January", "AED 50.00"]],
      },
    });
  });

  it("accepts extended bar and line datasets", async () => {
    const period = { fromDate: "2025-01-01", label: "2025 to 2026", toDate: "2026-12-31" };
    const money = (amount: string) => ({ amount, currency: "AED", display: `AED ${amount}` });
    const linePoints = Array.from({ length: 24 }, (_, index) => ({
      income: money(`${index + 1}.00`),
      label: `Month ${index + 1}`,
      spending: money(`-${index + 1}.00`),
    }));
    const barItems = Array.from({ length: 20 }, (_, index) => ({ label: `Category ${index + 1}`, value: money(`${index + 1}.00`) }));
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(answer({ kind: "line", period, points: linePoints, title: "Balance growth" }))
      .mockResolvedValueOnce(answer({ items: barItems, kind: "bar", period, title: "Spending by category" })) as unknown as typeof fetch;

    await expect(sendChatMessage({ history: [], message: "Show two years by month" })).resolves.toMatchObject({
      visual: { kind: "line", points: linePoints },
    });
    await expect(sendChatMessage({ history: [], message: "Show 20 categories" })).resolves.toMatchObject({
      visual: { items: barItems, kind: "bar" },
    });
  });

  it("rejects the retired summary widget", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      answer({
        kind: "summary",
        metrics: [
          {
            count: null,
            key: "largest_purchase",
            label: "Largest purchase",
            money: { amount: "50.00", currency: "AED", display: "AED 50.00" },
            percentage: null,
          },
        ],
        period: { fromDate: "2099-01-01", label: "January 2099", toDate: "2099-01-31" },
        title: "Spending summary",
      }),
    ) as unknown as typeof fetch;

    await expect(sendChatMessage({ history: [], message: "Show my largest purchase" })).rejects.toMatchObject({
      status: 502,
    });
  });
});
