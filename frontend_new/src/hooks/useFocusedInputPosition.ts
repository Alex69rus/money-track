import { type RefObject, useEffect } from "react";
import { getTelegramWebApp } from "@/services/telegram/webapp";

const EDITING_TOP_OFFSET_PX = 20;
const KEYBOARD_SETTLE_DELAY_MS = 180;

function isEditableTarget(target: EventTarget | null): target is HTMLElement {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.dataset.skipFocusPosition === "true") {
    return false;
  }

  return target.matches("input:not([type='hidden']), textarea, select, [contenteditable='true']");
}

/**
 * Keeps the focused field near the top of the scrollable app surface. A second
 * adjustment after visualViewport resize covers the iOS keyboard transition.
 */
export function useFocusedInputPosition(scrollContainerRef: RefObject<HTMLElement>): void {
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) {
      return;
    }

    let activeTarget: HTMLElement | null = null;
    let animationFrameId: number | null = null;
    let settleTimeoutId: number | null = null;

    const positionFocusedField = (): void => {
      const target = activeTarget;
      if (!target || document.activeElement !== target) {
        return;
      }

      const targetScrollContainer =
        target.closest<HTMLElement>("[data-focus-scroll-container]") ?? scrollContainer;
      const containerRect = targetScrollContainer.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const nextScrollTop = Math.max(
        0,
        targetScrollContainer.scrollTop + targetRect.top - containerRect.top - EDITING_TOP_OFFSET_PX,
      );

      targetScrollContainer.scrollTo({
        top: nextScrollTop,
        behavior: "smooth",
      });
    };

    const schedulePositioning = (): void => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      if (settleTimeoutId !== null) {
        window.clearTimeout(settleTimeoutId);
      }

      animationFrameId = requestAnimationFrame(positionFocusedField);
      settleTimeoutId = window.setTimeout(positionFocusedField, KEYBOARD_SETTLE_DELAY_MS);
    };

    const handleFocusIn = (event: FocusEvent): void => {
      if (!isEditableTarget(event.target)) {
        return;
      }

      activeTarget = event.target;
      schedulePositioning();
    };

    const handleFocusOut = (event: FocusEvent): void => {
      if (event.target === activeTarget) {
        activeTarget = null;
      }
    };

    scrollContainer.addEventListener("focusin", handleFocusIn);
    scrollContainer.addEventListener("focusout", handleFocusOut);
    window.visualViewport?.addEventListener("resize", schedulePositioning);
    const webApp = getTelegramWebApp();
    webApp?.onEvent?.("viewportChanged", schedulePositioning);

    return () => {
      scrollContainer.removeEventListener("focusin", handleFocusIn);
      scrollContainer.removeEventListener("focusout", handleFocusOut);
      window.visualViewport?.removeEventListener("resize", schedulePositioning);
      webApp?.offEvent?.("viewportChanged", schedulePositioning);
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      if (settleTimeoutId !== null) {
        window.clearTimeout(settleTimeoutId);
      }
    };
  }, [scrollContainerRef]);
}
