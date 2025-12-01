import { useState, useEffect } from 'react';
import TelegramService from '../services/telegram';

/**
 * Custom hook that provides stable viewport height from Telegram SDK.
 * The stable height doesn't change when the iOS keyboard opens, preventing
 * modals from shifting upward in Telegram Web App.
 *
 * Falls back to window.innerHeight for non-Telegram environments.
 *
 * @returns {Object} Object containing stableHeight in pixels
 */
export const useStableViewport = () => {
  const telegramService = TelegramService.getInstance();

  const [stableHeight, setStableHeight] = useState<number>(
    telegramService.getStableViewportHeight()
  );

  useEffect(() => {
    // Update stable height when Telegram viewport changes
    const handleViewportChange = () => {
      const newHeight = telegramService.getStableViewportHeight();
      setStableHeight(newHeight);
    };

    // Register viewport change listener
    const unsubscribe = telegramService.onViewportChanged(handleViewportChange);

    // Cleanup listener on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [telegramService]);

  return { stableHeight };
};
