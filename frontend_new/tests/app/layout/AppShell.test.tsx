import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "@/app/layout/AppShell";
import { activateFallbackMode, resetFallbackModeForTests } from "@/services/api/fallback-mode";

vi.mock("@/hooks/useKeyboardOpen", () => ({
  useKeyboardOpen: () => false,
}));

function renderShell(initialPath = "/transactions"): void {
  render(
    <MemoryRouter
      future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
      initialEntries={[initialPath]}
    >
      <AppShell>
        <div>page-content</div>
      </AppShell>
    </MemoryRouter>,
  );
}

describe("AppShell", () => {
  afterEach(() => {
    cleanup();
    act(() => {
      resetFallbackModeForTests();
    });
  });

  it("renders only approved navigation destinations", async () => {
    renderShell();
    await waitFor(() => {
      expect(screen.getByTestId("app-shell-nav")).toBeInTheDocument();
    });

    const navLinks = screen.getAllByTestId(/app-shell-nav-link-/);
    expect(navLinks).toHaveLength(4);
    expect(navLinks.map((link) => link.textContent)).toEqual([
      "Transactions",
      "Analytics",
      "AI Chat",
      "Settings",
    ]);
  });

  it("shows fallback banner when controlled fallback mode is active", async () => {
    activateFallbackMode("Backend is unreachable. Showing local fallback data.");
    renderShell();
    await waitFor(() => {
      expect(screen.getByTestId("app-shell-fallback-mode")).toBeInTheDocument();
    });
  });

  it("delegates scrolling to the AI Chat timeline and gives its composer the standard navigation gutter", () => {
    renderShell("/chat");
    expect(screen.getByTestId("app-shell-main")).toHaveClass("overflow-hidden");
    expect(screen.getByTestId("app-shell-main")).not.toHaveClass("overflow-y-auto");
    expect(screen.getByTestId("app-shell-main")).toHaveClass("mt-chat-composer-reserve");

    cleanup();
    renderShell("/transactions");
    expect(screen.getByTestId("app-shell-main")).toHaveClass("overflow-y-auto");
    expect(screen.getByTestId("app-shell-main")).not.toHaveClass("mt-chat-composer-reserve");
  });
});
