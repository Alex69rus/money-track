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
});
