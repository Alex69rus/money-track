import { afterEach, describe, expect, it } from "vitest";
import {
  initializeTelegramWebApp,
  subscribeTelegramFullscreenLock,
  subscribeTelegramThemeChanges,
  type TelegramWebApp,
} from "@/services/telegram/webapp";

interface TelegramTestWindow extends Window {
  Telegram?: {
    WebApp?: TelegramWebApp;
  };
}

function telegramTestWindow(): TelegramTestWindow {
  return window as TelegramTestWindow;
}

function createEventRegistry(): {
  emit: (event: string) => void;
  offEvent: (event: string, handler: () => void) => void;
  onEvent: (event: string, handler: () => void) => void;
  size: (event: string) => number;
} {
  const handlers = new Map<string, Set<() => void>>();

  return {
    emit: (event) => {
      handlers.get(event)?.forEach((handler) => handler());
    },
    offEvent: (event, handler) => {
      handlers.get(event)?.delete(handler);
    },
    onEvent: (event, handler) => {
      const eventHandlers = handlers.get(event) ?? new Set<() => void>();
      eventHandlers.add(handler);
      handlers.set(event, eventHandlers);
    },
    size: (event) => handlers.get(event)?.size ?? 0,
  };
}

describe("Telegram WebApp adapter", () => {
  afterEach(() => {
    delete telegramTestWindow().Telegram;
    document.documentElement.style.removeProperty("--mt-viewport-current-height");
    document.documentElement.style.removeProperty("--mt-viewport-stable-height");
    delete document.documentElement.dataset.mtTheme;
  });

  it("requests fullscreen, disables vertical swipes, and restores fullscreen after a host exit", () => {
    const events = createEventRegistry();
    let readyCalls = 0;
    let expandCalls = 0;
    let disableVerticalSwipesCalls = 0;
    let fullscreenRequests = 0;
    const webApp: TelegramWebApp = {
      disableVerticalSwipes: () => {
        disableVerticalSwipesCalls += 1;
      },
      expand: () => {
        expandCalls += 1;
      },
      initData: "",
      isFullscreen: false,
      isVersionAtLeast: () => true,
      offEvent: events.offEvent,
      onEvent: events.onEvent,
      ready: () => {
        readyCalls += 1;
      },
      requestFullscreen: () => {
        fullscreenRequests += 1;
        webApp.isFullscreen = true;
      },
    };
    telegramTestWindow().Telegram = { WebApp: webApp };

    initializeTelegramWebApp();
    const unsubscribe = subscribeTelegramFullscreenLock();

    expect(readyCalls).toBe(1);
    expect(expandCalls).toBe(1);
    expect(disableVerticalSwipesCalls).toBe(1);
    expect(fullscreenRequests).toBe(1);

    webApp.isFullscreen = false;
    events.emit("fullscreenChanged");

    expect(fullscreenRequests).toBe(2);

    unsubscribe();
    expect(events.size("fullscreenChanged")).toBe(0);
  });

  it("keeps normal host behavior when fullscreen and swipe APIs are unavailable", () => {
    let readyCalls = 0;
    let expandCalls = 0;
    telegramTestWindow().Telegram = {
      WebApp: {
        expand: () => {
          expandCalls += 1;
        },
        initData: "",
        isVersionAtLeast: () => false,
        ready: () => {
          readyCalls += 1;
        },
      },
    };

    initializeTelegramWebApp();

    expect(readyCalls).toBe(1);
    expect(expandCalls).toBe(1);
    expect(subscribeTelegramFullscreenLock()).toBeTypeOf("function");
  });

  it("keeps the document palette synchronized with Telegram theme changes", () => {
    const events = createEventRegistry();
    const webApp: TelegramWebApp = {
      colorScheme: "dark",
      expand: () => undefined,
      initData: "",
      offEvent: events.offEvent,
      onEvent: events.onEvent,
      ready: () => undefined,
    };
    telegramTestWindow().Telegram = { WebApp: webApp };

    initializeTelegramWebApp();
    const unsubscribe = subscribeTelegramThemeChanges(() => undefined);

    expect(document.documentElement.dataset.mtTheme).toBe("dark");

    webApp.colorScheme = "light";
    events.emit("themeChanged");

    expect(document.documentElement.dataset.mtTheme).toBe("light");

    unsubscribe();
    expect(events.size("themeChanged")).toBe(0);
  });
});
