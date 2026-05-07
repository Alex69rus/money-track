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
  viewportStableHeight?: number;
  colorScheme?: "light" | "dark";
  ready: () => void;
  expand: () => void;
  isVersionAtLeast?: (version: string) => boolean;
  onEvent?: (event: string, handler: () => void) => void;
  offEvent?: (event: string, handler: () => void) => void;
}

const TELEGRAM_VIEWPORT_EVENTS = [
  "viewportChanged",
  "safeAreaChanged",
  "contentSafeAreaChanged",
  "fullscreenChanged",
] as const;

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

function setRootCssVariable(name: string, value: string): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.style.setProperty(name, value);
}

function syncStableViewportHeightCssVar(webApp: TelegramWebApp | undefined): void {
  if (!webApp?.viewportStableHeight || webApp.viewportStableHeight <= 0) {
    setRootCssVariable("--mt-viewport-stable-height", "100dvh");
    return;
  }

  setRootCssVariable("--mt-viewport-stable-height", `${Math.round(webApp.viewportStableHeight)}px`);
}

export function initializeTelegramWebApp(): void {
  const webApp = getTelegramWebApp();
  syncStableViewportHeightCssVar(webApp);

  if (!webApp) {
    return;
  }

  webApp.ready();
  webApp.expand();
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
