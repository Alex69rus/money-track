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

export function initializeTelegramWebApp(): void {
  const webApp = getTelegramWebApp();
  if (!webApp) {
    return;
  }

  webApp.ready();
  webApp.expand();
}

export function getTelegramInitData(): string {
  return getTelegramWebApp()?.initData ?? "";
}
