const DEFAULT_PROFILE = {
  platform: "ios",
  viewportHeight: 844,
  viewportStableHeight: 844,
  safeAreaBottom: 34,
};

/**
 * Installs the small, observable slice of Telegram WebApp used by the app.
 * This lets Playwright exercise lifecycle and viewport events without treating
 * a regular mobile browser as a Telegram client.
 */
export async function installTelegramFixture(context, profile = {}) {
  const settings = { ...DEFAULT_PROFILE, ...profile };

  await context.route("**/telegram-web-app.js*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: "",
    });
  });

  await context.addInitScript((initialSettings) => {
    const handlers = new Map();
    const state = {
      events: [],
      expandCalls: 0,
      readyCalls: 0,
      safeAreaBottom: initialSettings.safeAreaBottom,
      viewportHeight: initialSettings.viewportHeight,
      viewportStableHeight: initialSettings.viewportStableHeight,
    };

    const applyCssVariables = () => {
      const root = document.documentElement;
      if (!root) {
        return;
      }

      root.style.setProperty("--tg-viewport-height", `${state.viewportHeight}px`);
      root.style.setProperty("--tg-viewport-stable-height", `${state.viewportStableHeight}px`);
      root.style.setProperty("--tg-safe-area-inset-bottom", `${state.safeAreaBottom}px`);
      root.style.setProperty("--tg-content-safe-area-inset-bottom", `${state.safeAreaBottom}px`);
    };

    const emit = (event) => {
      state.events.push(event);
      for (const handler of handlers.get(event) ?? []) {
        handler();
      }
    };

    const webApp = {
      colorScheme: "light",
      initData: "user=%7B%22id%22%3A123456789%7D&hash=qa-telegram-fixture",
      initDataUnsafe: { user: { id: 123456789, username: "qa_telegram" } },
      platform: initialSettings.platform,
      version: "8.0",
      viewportHeight: state.viewportHeight,
      viewportStableHeight: state.viewportStableHeight,
      expand: () => {
        state.expandCalls += 1;
      },
      isVersionAtLeast: () => true,
      offEvent: (event, handler) => {
        handlers.get(event)?.delete(handler);
      },
      onEvent: (event, handler) => {
        const listeners = handlers.get(event) ?? new Set();
        listeners.add(handler);
        handlers.set(event, listeners);
      },
      ready: () => {
        state.readyCalls += 1;
      },
    };

    window.Telegram = { WebApp: webApp };
    window.__qaTelegram = {
      emit,
      getState: () => ({
        ...state,
        registeredEvents: [...handlers.keys()].sort(),
      }),
      setViewport: ({ safeAreaBottom, viewportHeight, viewportStableHeight }) => {
        if (typeof safeAreaBottom === "number") {
          state.safeAreaBottom = safeAreaBottom;
        }
        if (typeof viewportHeight === "number") {
          state.viewportHeight = viewportHeight;
          webApp.viewportHeight = viewportHeight;
        }
        if (typeof viewportStableHeight === "number") {
          state.viewportStableHeight = viewportStableHeight;
          webApp.viewportStableHeight = viewportStableHeight;
        }
        applyCssVariables();
        emit("viewportChanged");
      },
    };

    applyCssVariables();
  }, settings);
}
