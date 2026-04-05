import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AiChatPage } from "@/pages/AiChatPage";

function renderChatPage(): void {
  render(
    <MemoryRouter initialEntries={["/chat"]}>
      <Routes>
        <Route element={<AiChatPage />} path="/chat" />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AiChatPage", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("sends via Enter, shows pending state, and appends user/assistant timeline messages", async () => {
    let resolveFetch: ((value: Response) => void) | null = null;
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    renderChatPage();

    const textarea = screen.getByTestId("ai-chat-input");
    fireEvent.change(textarea, { target: { value: "How much did I spend?" } });
    fireEvent.keyDown(textarea, { key: "Enter" });

    expect(await screen.findByTestId("ai-chat-pending")).toBeInTheDocument();
    expect(screen.getByTestId("ai-chat-send")).toBeDisabled();

    resolveFetch?.(
      new Response(JSON.stringify({ response: "You spent AED 1200 this month." }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await waitFor(() => {
      expect(screen.queryByTestId("ai-chat-pending")).not.toBeInTheDocument();
    });

    expect(screen.getAllByTestId("ai-chat-message-user")).toHaveLength(1);
    expect(screen.getAllByTestId("ai-chat-message-assistant").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("You spent AED 1200 this month.")).toBeInTheDocument();
  });

  it("does not send on Shift+Enter and preserves composer content", () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    renderChatPage();

    const textarea = screen.getByTestId("ai-chat-input");
    fireEvent.change(textarea, { target: { value: "line one" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });

    expect(fetchMock).not.toHaveBeenCalled();
    expect((textarea as HTMLTextAreaElement).value).toBe("line one");
  });

  it("shows fallback + error on request failure and supports reset confirmation flow", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("upstream unavailable", { status: 500 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ response: "Recovered answer." }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    global.fetch = fetchMock as unknown as typeof fetch;

    renderChatPage();

    const sessionBefore = screen.getByTestId("ai-chat-session-id").textContent;

    fireEvent.change(screen.getByTestId("ai-chat-input"), { target: { value: "failed prompt" } });
    fireEvent.click(screen.getByTestId("ai-chat-send"));

    expect(await screen.findByTestId("ai-chat-error")).toBeInTheDocument();
    expect(await screen.findByTestId("ai-chat-fallback")).toBeInTheDocument();
    expect(screen.getByTestId("ai-chat-retry-last")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("ai-chat-retry-last"));
    expect(await screen.findByText("Recovered answer.")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("ai-chat-reset-trigger"));
    expect(await screen.findByTestId("ai-chat-reset-dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("ai-chat-reset-confirm"));

    await waitFor(() => {
      expect(screen.queryByTestId("ai-chat-reset-dialog")).not.toBeInTheDocument();
    });

    const sessionAfter = screen.getByTestId("ai-chat-session-id").textContent;
    expect(sessionAfter).not.toEqual(sessionBefore);
    expect(screen.queryByTestId("ai-chat-message-user")).not.toBeInTheDocument();
  });
});
