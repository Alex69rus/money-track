export interface TelegramWebApp {
  initData: string;
  initDataUnsafe?: {
    user?: {
      id?: number;
      username?: string;
    };
  };
  platform?: string;
  version?: string;
  viewportHeight?: number;
  viewportStableHeight?: number;
  isFullscreen?: boolean;
  colorScheme?: "light" | "dark";
  ready: () => void;
  expand: () => void;
  disableVerticalSwipes?: () => void;
  requestFullscreen?: () => void;
  isVersionAtLeast?: (version: string) => boolean;
  onEvent?: (event: string, handler: () => void) => void;
  offEvent?: (event: string, handler: () => void) => void;
  BackButton?: {
    isVisible?: boolean;
    show: () => void;
    hide: () => void;
    onClick: (handler: () => void) => void;
    offClick: (handler: () => void) => void;
  };
}

const TELEGRAM_VIEWPORT_EVENTS = [
  "viewportChanged",
  "safeAreaChanged",
  "contentSafeAreaChanged",
  "fullscreenChanged",
] as const;

const TELEGRAM_THEME_CHANGED_EVENT = "themeChanged";
const DISABLE_VERTICAL_SWIPES_MIN_VERSION = "7.7";
const FULLSCREEN_MIN_VERSION = "8.0";

interface WindowWithTelegram extends Window {
  Telegram?: {
    WebApp?: TelegramWebApp;
  };
}

function getWindow(): WindowWithTelegram | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  return window as WindowWithTelegram;
}

export function getTelegramWebApp(): TelegramWebApp | undefined {
  return getWindow()?.Telegram?.WebApp;
}

export function isTelegramWebAppAvailable(): boolean {
  return getTelegramWebApp() !== undefined;
}

export function supportsTelegramWebAppVersion(webApp: TelegramWebApp, version: string): boolean {
  return webApp.isVersionAtLeast ? webApp.isVersionAtLeast(version) : true;
}

function requestTelegramFullscreen(webApp: TelegramWebApp): void {
  if (
    webApp.isFullscreen === true ||
    !webApp.requestFullscreen ||
    !supportsTelegramWebAppVersion(webApp, FULLSCREEN_MIN_VERSION)
  ) {
    return;
  }

  try {
    webApp.requestFullscreen();
  } catch {
    // Some Telegram clients can reject this host request despite reporting a compatible version.
  }
}

function setRootCssVariable(name: string, value: string): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.style.setProperty(name, value);
}

function getPreferredColorScheme(): "light" | "dark" {
  if (typeof window === "undefined" || !window.matchMedia) {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function syncThemeCssAttribute(webApp: TelegramWebApp | undefined): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.mtTheme = webApp?.colorScheme ?? getPreferredColorScheme();
}

function syncStableViewportHeightCssVar(webApp: TelegramWebApp | undefined): void {
  if (!webApp?.viewportStableHeight || webApp.viewportStableHeight <= 0) {
    setRootCssVariable("--mt-viewport-stable-height", "100dvh");
    setRootCssVariable("--mt-viewport-current-height", "100dvh");
    return;
  }

  setRootCssVariable("--mt-viewport-stable-height", `${Math.round(webApp.viewportStableHeight)}px`);
  setRootCssVariable(
    "--mt-viewport-current-height",
    webApp.viewportHeight && webApp.viewportHeight > 0
      ? `${Math.round(webApp.viewportHeight)}px`
      : `${Math.round(webApp.viewportStableHeight)}px`,
  );
}

export function initializeTelegramWebApp(): void {
  const webApp = getTelegramWebApp();
  syncStableViewportHeightCssVar(webApp);
  syncThemeCssAttribute(webApp);

  if (!webApp) {
    return;
  }

  webApp.ready();
  webApp.expand();

  if (webApp.disableVerticalSwipes && supportsTelegramWebAppVersion(webApp, DISABLE_VERTICAL_SWIPES_MIN_VERSION)) {
    try {
      webApp.disableVerticalSwipes();
    } catch {
      // Preserve normal app launch when a client does not honor the optional host API.
    }
  }

  requestTelegramFullscreen(webApp);
}

export function subscribeTelegramThemeChanges(onChange: () => void): () => void {
  const webApp = getTelegramWebApp();
  syncThemeCssAttribute(webApp);

  const handler = (): void => {
    syncThemeCssAttribute(getTelegramWebApp());
    onChange();
  };

  if (webApp?.onEvent && webApp.offEvent) {
    webApp.onEvent(TELEGRAM_THEME_CHANGED_EVENT, handler);
    return () => {
      webApp.offEvent?.(TELEGRAM_THEME_CHANGED_EVENT, handler);
    };
  }

  if (typeof window === "undefined" || !window.matchMedia) {
    return () => undefined;
  }

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  mediaQuery.addEventListener?.("change", handler);

  return () => {
    mediaQuery.removeEventListener?.("change", handler);
  };
}

export function getTelegramInitData(): string {
  return getTelegramWebApp()?.initData ?? "";
}

export function subscribeTelegramViewportChanges(onChange: () => void): () => void {
  const webApp = getTelegramWebApp();
  syncStableViewportHeightCssVar(webApp);

  if (!webApp?.onEvent || !webApp.offEvent) {
    return () => undefined;
  }

  const handler = (): void => {
    syncStableViewportHeightCssVar(getTelegramWebApp());
    onChange();
  };

  TELEGRAM_VIEWPORT_EVENTS.forEach((event) => {
    webApp.onEvent?.(event, handler);
  });

  return () => {
    TELEGRAM_VIEWPORT_EVENTS.forEach((event) => {
      webApp.offEvent?.(event, handler);
    });
  };
}

/**
 * Re-requests fullscreen if the host exits it while the app is active. The
 * request remains version-gated and harmless in browser development mode.
 */
export function subscribeTelegramFullscreenLock(): () => void {
  const webApp = getTelegramWebApp();
  if (
    !webApp?.onEvent ||
    !webApp.offEvent ||
    !webApp.requestFullscreen ||
    !supportsTelegramWebAppVersion(webApp, FULLSCREEN_MIN_VERSION)
  ) {
    return () => undefined;
  }

  const handler = (): void => {
    if (webApp.isFullscreen === false) {
      requestTelegramFullscreen(webApp);
    }
  };

  webApp.onEvent("fullscreenChanged", handler);

  return () => {
    webApp.offEvent?.("fullscreenChanged", handler);
  };
}
