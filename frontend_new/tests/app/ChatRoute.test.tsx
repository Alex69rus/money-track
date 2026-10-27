import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("lazy Chat route", () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => {
    cleanup();
    vi.doUnmock("@/pages/AiChatPage");
    vi.restoreAllMocks();
  });

  it("loads Chat on demand with visible progress and keeps navigation usable", async () => {
    let finishLoad: (() => void) | undefined;
    const loaded = new Promise<void>((resolve) => { finishLoad = resolve; });
    const load = vi.fn(async () => {
      await loaded;
      return { AiChatPage: () => <h1>Chat ready</h1> };
    });
    vi.doMock("@/pages/AiChatPage", load);
    const { default: App } = await import("@/app/App");
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={["/settings"]}><App /></MemoryRouter>);
    expect(load).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("link", { name: "Open AI Chat" }));
    expect(await screen.findByText("Loading AI Chat…")).toBeInTheDocument();
    expect(screen.getByTestId("app-shell-nav")).toBeInTheDocument();
    await act(async () => { finishLoad?.(); await loaded; });
    expect(await screen.findByRole("heading", { name: "Chat ready" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: "Open Settings" }));
    fireEvent.click(screen.getByRole("link", { name: "Open AI Chat" }));
    expect(await screen.findByRole("heading", { name: "Chat ready" })).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("contains a failed chunk and offers reload while allowing navigation away", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.doMock("@/pages/AiChatPage", () => { throw new Error("Chunk unavailable"); });
    const { default: App } = await import("@/app/App");
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={["/chat"]}><App /></MemoryRouter>);

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not open AI Chat");
    expect(screen.getByRole("button", { name: "Reload AI Chat" })).toBeEnabled();
    fireEvent.click(screen.getByRole("link", { name: "Open Settings" }));
    expect(screen.queryByText("Could not open AI Chat")).not.toBeInTheDocument();
    expect(screen.getByTestId("app-shell-nav")).toBeInTheDocument();
  });
});
