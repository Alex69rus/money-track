import { useEffect } from "react";
import { getTelegramWebApp, supportsTelegramWebAppVersion } from "@/services/telegram/webapp";

interface UseTelegramBackButtonOptions {
  enabled: boolean;
  onBack: () => void;
}

const BACK_BUTTON_MIN_VERSION = "6.1";

/**
 * Gives Telegram's host BackButton ownership of in-app return navigation.
 * Browser navigation remains untouched when the app is opened outside Telegram.
 */
export function useTelegramBackButton({ enabled, onBack }: UseTelegramBackButtonOptions): void {
  useEffect(() => {
    const webApp = getTelegramWebApp();
    const backButton = webApp?.BackButton;

    if (!backButton || !webApp || !supportsTelegramWebAppVersion(webApp, BACK_BUTTON_MIN_VERSION)) {
      return;
    }

    if (!enabled) {
      backButton.hide();
      return;
    }

    const handleClick = (): void => {
      onBack();
    };

    backButton.show();
    backButton.onClick(handleClick);

    return () => {
      backButton.offClick(handleClick);
      backButton.hide();
    };
  }, [enabled, onBack]);
}
