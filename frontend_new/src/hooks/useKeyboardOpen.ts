import { useEffect, useState } from "react";
import { getTelegramWebApp } from "@/services/telegram/webapp";

const KEYBOARD_THRESHOLD_PX = 120;

export function useKeyboardOpen(): boolean {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    const viewport = window.visualViewport;
    const webApp = getTelegramWebApp();

    const update = (): void => {
      const browserViewportHeight = viewport?.height ?? window.innerHeight;
      const telegramViewportHeight = webApp?.viewportHeight;
      const currentHeight =
        typeof telegramViewportHeight === "number" && telegramViewportHeight > 0
          ? Math.min(browserViewportHeight, telegramViewportHeight)
          : browserViewportHeight;
      const fullHeight = Math.max(window.innerHeight, webApp?.viewportStableHeight ?? 0);
      setIsKeyboardOpen(fullHeight - currentHeight > KEYBOARD_THRESHOLD_PX);
    };

    update();

    if (viewport) {
      viewport.addEventListener("resize", update);
    } else {
      window.addEventListener("resize", update);
    }
    webApp?.onEvent?.("viewportChanged", update);

    return () => {
      if (viewport) {
        viewport.removeEventListener("resize", update);
      } else {
        window.removeEventListener("resize", update);
      }
      webApp?.offEvent?.("viewportChanged", update);
    };
  }, []);

  return isKeyboardOpen;
}
