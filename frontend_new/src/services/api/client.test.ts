import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/services/api/client";

vi.mock("@/services/telegram/webapp", () => ({
  getTelegramInitData: () => "tg-init-data-test",
}));

describe("apiRequest", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("injects telegram init data header on API requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    await apiRequest<{ ok: boolean }>("/api/health", {
      method: "POST",
      body: JSON.stringify({ check: true }),
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, requestOptions] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(requestOptions.headers);

    expect(headers.get("X-Telegram-Init-Data")).toBe("tg-init-data-test");
    expect(headers.get("Content-Type")).toBe("application/json");
  });
});
