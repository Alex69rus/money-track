import { afterEach, describe, expect, it, vi } from "vitest";
import { sendChatMessage } from "@/services/api/chat";

function answer(visual: object | null): Response {
  return new Response(JSON.stringify({ kind: "answer", message: "Server-rendered answer.", version: "v1", visual }), {
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
        measure: "spending",
        period: { fromDate: "2099-01-01", label: "January", toDate: "2099-01-31" },
        title: "Spending by category",
      }),
    ) as unknown as typeof fetch;

    await expect(sendChatMessage({ history: [], message: "Show spending" })).rejects.toMatchObject({
      status: 502,
    });
  });
});
