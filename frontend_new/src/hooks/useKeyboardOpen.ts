import { useEffect, useState } from "react";

const KEYBOARD_THRESHOLD_PX = 120;

export function useKeyboardOpen(): boolean {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    const viewport = window.visualViewport;

    const update = (): void => {
      const currentHeight = viewport?.height ?? window.innerHeight;
      const fullHeight = window.innerHeight;
      setIsKeyboardOpen(fullHeight - currentHeight > KEYBOARD_THRESHOLD_PX);
    };

    update();

    if (viewport) {
      viewport.addEventListener("resize", update);
      return () => viewport.removeEventListener("resize", update);
    }

    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return isKeyboardOpen;
}
