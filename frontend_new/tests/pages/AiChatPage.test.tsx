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

function response(message: string, visual: object | null = null): Response {
  return new Response(JSON.stringify({ version: "v1", kind: "answer", message, visual }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
}

function payloadFromRequest(request: RequestInit | undefined): { history: unknown[]; message: string } {
  if (typeof request?.body !== "string") {
    throw new Error("Expected a JSON request body.");
  }
  return JSON.parse(request.body) as { history: unknown[]; message: string };
}

describe("AiChatPage", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("uses a minimal accessible chat composition without suggestions or desktop-only chrome", () => {
    renderChatPage();

    expect(screen.getByTestId("ai-chat-header")).toHaveTextContent("AI Chat");
    expect(screen.getByRole("button", { name: "Start a new AI chat" })).toBeInTheDocument();
    expect(screen.getByTestId("ai-chat-composer")).toBeInTheDocument();
    expect(screen.getByTestId("ai-chat-input")).toHaveAttribute("data-skip-focus-position", "true");
    expect(screen.queryByTestId("ai-chat-suggestions")).not.toBeInTheDocument();
    expect(screen.queryByText("Conversation")).not.toBeInTheDocument();
    expect(screen.queryByText("Message", { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByText("Enter to send, Shift+Enter for a new line.")).not.toBeInTheDocument();
    expect(screen.queryByText("Assistant", { exact: true })).not.toBeInTheDocument();
  });

  it("sends via Enter, shows pending state, and appends distinct user and assistant messages", async () => {
    let resolveFetch!: (value: Response) => void;
    const fetchMock = vi.fn(
      (_input: RequestInfo | URL, _init?: RequestInit) => {
        void _input;
        void _init;
        return new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        });
      },
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    renderChatPage();

    const textarea = screen.getByTestId("ai-chat-input");
    fireEvent.change(textarea, { target: { value: "How much did I spend?" } });
    fireEvent.keyDown(textarea, { key: "Enter" });

    expect(await screen.findByTestId("ai-chat-pending")).toBeInTheDocument();
    expect(screen.getByTestId("ai-chat-send")).toBeDisabled();

    resolveFetch(response("You spent AED 1200 this month."));

    await waitFor(() => {
      expect(screen.queryByTestId("ai-chat-pending")).not.toBeInTheDocument();
    });

    const initialRequest = fetchMock.mock.calls[0]?.[1];
    const payload = payloadFromRequest(initialRequest);
    expect(payload).toEqual({ history: [], message: "How much did I spend?" });
    expect(screen.getAllByTestId("ai-chat-message-user")).toHaveLength(1);
    expect(screen.getAllByTestId("ai-chat-message-assistant")).toHaveLength(1);
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

  it("keeps the initial chat at the primary-page top, then scrolls only its timeline after a user prompt", async () => {
    const timelineScrollTo = vi.spyOn(HTMLElement.prototype, "scrollTo");
    const documentScrollIntoView = vi.spyOn(Element.prototype, "scrollIntoView");
    global.fetch = vi.fn().mockResolvedValue(response("Answered.")) as unknown as typeof fetch;

    renderChatPage();
    expect(timelineScrollTo).not.toHaveBeenCalled();

    fireEvent.change(screen.getByTestId("ai-chat-input"), { target: { value: "Show spending" } });
    fireEvent.click(screen.getByTestId("ai-chat-send"));

    await waitFor(() => {
      expect(timelineScrollTo).toHaveBeenCalled();
    });
    expect(documentScrollIntoView).not.toHaveBeenCalled();
  });

  it("retries the same history without inventing or duplicating a user message, then starts a new chat", async () => {
    const fetchMock = vi
      .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(new Response("upstream unavailable", { status: 500 }))
      .mockResolvedValueOnce(response("Recovered answer."))
      .mockResolvedValueOnce(response("Follow-up answer."));
    global.fetch = fetchMock as unknown as typeof fetch;

    renderChatPage();

    fireEvent.change(screen.getByTestId("ai-chat-input"), { target: { value: "failed prompt" } });
    fireEvent.click(screen.getByTestId("ai-chat-send"));

    expect(await screen.findByTestId("ai-chat-error")).toBeInTheDocument();
    expect(screen.queryByTestId("ai-chat-fallback")).not.toBeInTheDocument();
    expect(screen.getByTestId("ai-chat-retry-last")).toBeInTheDocument();
    expect(screen.getAllByTestId("ai-chat-message-user")).toHaveLength(1);

    fireEvent.click(screen.getByTestId("ai-chat-retry-last"));
    expect(await screen.findByText("Recovered answer.")).toBeInTheDocument();
    expect(screen.getAllByTestId("ai-chat-message-user")).toHaveLength(1);
    const retryRequest = fetchMock.mock.calls[1]?.[1];
    const retryPayload = payloadFromRequest(retryRequest);
    expect(retryPayload).toEqual({ history: [], message: "failed prompt" });

    fireEvent.change(screen.getByTestId("ai-chat-input"), { target: { value: "follow-up prompt" } });
    fireEvent.click(screen.getByTestId("ai-chat-send"));
    expect(await screen.findByText("Follow-up answer.")).toBeInTheDocument();
    const followUpRequest = fetchMock.mock.calls[2]?.[1];
    expect(payloadFromRequest(followUpRequest)).toEqual({
      history: [
        { content: "failed prompt", role: "user" },
        { content: "Recovered answer.", role: "assistant" },
      ],
      message: "follow-up prompt",
    });

    fireEvent.click(screen.getByTestId("ai-chat-reset-trigger"));
    expect(await screen.findByTestId("ai-chat-reset-dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("ai-chat-reset-confirm"));

    await waitFor(() => {
      expect(screen.queryByTestId("ai-chat-reset-dialog")).not.toBeInTheDocument();
    });
    expect(screen.queryByTestId("ai-chat-message-user")).not.toBeInTheDocument();
    expect(screen.queryByTestId("ai-chat-message-assistant")).not.toBeInTheDocument();
  });

  it("keeps a failed user bubble visible without using it as a later prompt's history", async () => {
    const fetchMock = vi
      .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(new Response("upstream unavailable", { status: 500 }))
      .mockResolvedValueOnce(response("Second answer."));
    global.fetch = fetchMock as unknown as typeof fetch;

    renderChatPage();
    fireEvent.change(screen.getByTestId("ai-chat-input"), { target: { value: "failed prompt" } });
    fireEvent.click(screen.getByTestId("ai-chat-send"));
    expect(await screen.findByTestId("ai-chat-error")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("ai-chat-input"), { target: { value: "new prompt" } });
    fireEvent.click(screen.getByTestId("ai-chat-send"));
    expect(await screen.findByText("Second answer.")).toBeInTheDocument();

    const newRequest = fetchMock.mock.calls[1]?.[1];
    expect(payloadFromRequest(newRequest)).toEqual({ history: [], message: "new prompt" });
  });

  it("sends only the six newest completed dialogue pairs", async () => {
    const fetchMock = vi.fn((_: RequestInfo | URL, init?: RequestInit) => {
      const payload = payloadFromRequest(init);
      return Promise.resolve(response(`answer:${payload.message}`));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderChatPage();
    for (let index = 1; index <= 7; index += 1) {
      const prompt = `question:${index}`;
      fireEvent.change(screen.getByTestId("ai-chat-input"), { target: { value: prompt } });
      fireEvent.click(screen.getByTestId("ai-chat-send"));
      await screen.findByText(`answer:${prompt}`);
    }

    fireEvent.change(screen.getByTestId("ai-chat-input"), { target: { value: "question:8" } });
    fireEvent.click(screen.getByTestId("ai-chat-send"));
    await screen.findByText("answer:question:8");

    const eighthRequest = fetchMock.mock.calls[7]?.[1];
    const payload = payloadFromRequest(eighthRequest);
    expect(payload.history).toHaveLength(12);
    expect(payload.history[0]).toEqual({ content: "question:2", role: "user" });
    expect(payload.history[11]).toEqual({ content: "answer:question:7", role: "assistant" });
  });

  it("renders a server-grounded table visual", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      response("Spending for July was AED 120.", {
        kind: "table",
        period: { fromDate: "2099-07-01", label: "2099-07-01 to 2099-07-31", toDate: "2099-07-31" },
        columns: ["Category", "Spending"],
        rows: [["Food", "AED 120.00"]],
        title: "July spending",
      }),
    ) as unknown as typeof fetch;

    renderChatPage();
    fireEvent.change(screen.getByTestId("ai-chat-input"), { target: { value: "How much in July?" } });
    fireEvent.click(screen.getByTestId("ai-chat-send"));

    expect(await screen.findByTestId("ai-chat-visual-table")).toBeInTheDocument();
    expect(screen.getByText("AED 120.00")).toBeInTheDocument();
  });
});
