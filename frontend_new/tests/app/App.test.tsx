import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import App from "@/app/App";
import type { TelegramWebApp } from "@/services/telegram/webapp";

interface TelegramTestWindow extends Window {
  Telegram?: {
    WebApp?: TelegramWebApp;
  };
}

function telegramTestWindow(): TelegramTestWindow {
  return window as TelegramTestWindow;
}

describe("App", () => {
  afterEach(() => {
    cleanup();
    delete telegramTestWindow().Telegram;
  });

  it("keeps the browser development header fallback", () => {
    render(
      <MemoryRouter
        future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
        initialEntries={["/settings"]}
      >
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByText("Money Track")).toBeInTheDocument();
  });

  it("keeps primary navigation in Telegram and uses the host BackButton for nested pages", async () => {
    let backHandler: (() => void) | undefined;
    const backButton = {
      hide: () => undefined,
      offClick: (handler: () => void) => {
        if (backHandler === handler) {
          backHandler = undefined;
        }
      },
      onClick: (handler: () => void) => {
        backHandler = handler;
      },
      show: () => undefined,
    };

    telegramTestWindow().Telegram = {
      WebApp: {
        BackButton: backButton,
        expand: () => undefined,
        initData: "",
        isVersionAtLeast: () => true,
        ready: () => undefined,
      },
    };

    render(
      <MemoryRouter
        future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
        initialEntries={[
          "/transactions",
          { pathname: "/transactions/1/edit", state: { mtReturnPath: "/transactions" } },
        ]}
        initialIndex={1}
      >
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(backHandler).toBeDefined();
    });
    expect(screen.queryByTestId("app-shell-nav")).not.toBeInTheDocument();

    act(() => {
      backHandler?.();
    });

    await waitFor(() => {
      expect(screen.getByTestId("app-shell-nav")).toBeInTheDocument();
    });
  });
});
