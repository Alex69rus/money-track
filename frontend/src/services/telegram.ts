import WebApp from '@twa-dev/sdk';

class TelegramService {
  private static instance: TelegramService;
  
  private constructor() {
    this.init();
  }
  
  public static getInstance(): TelegramService {
    if (!TelegramService.instance) {
      TelegramService.instance = new TelegramService();
    }
    return TelegramService.instance;
  }
  
  private init(): void {
    if (WebApp.isExpanded) {
      WebApp.ready();
    } else {
      WebApp.expand();
      WebApp.ready();
    }
    
    WebApp.MainButton.hide();
    WebApp.BackButton.hide();
  }
  
  public getInitData(): string {
    return WebApp.initData;
  }
  
  public getUser() {
    return WebApp.initDataUnsafe?.user;
  }
  
  public isWebAppAvailable(): boolean {
    return !!WebApp.initData;
  }
  
  public showMainButton(text: string, onClick: () => void): void {
    WebApp.MainButton.setText(text);
    WebApp.MainButton.onClick(onClick);
    WebApp.MainButton.show();
  }
  
  public hideMainButton(): void {
    WebApp.MainButton.hide();
  }
  
  public showAlert(message: string): void {
    WebApp.showAlert(message);
  }
  
  public close(): void {
    WebApp.close();
  }

  /**
   * Get stable viewport height that doesn't change when keyboard opens.
   * Uses Telegram SDK's viewportStableHeight for Telegram Web App,
   * falls back to window.innerHeight for non-Telegram environments.
   *
   * @returns {number} Stable viewport height in pixels
   */
  public getStableViewportHeight(): number {
    // Check if Telegram WebApp is available and has viewportStableHeight
    if (WebApp && typeof WebApp.viewportStableHeight === 'number') {
      return WebApp.viewportStableHeight;
    }

    // Fallback to window.innerHeight for non-Telegram or development environments
    return window.innerHeight;
  }

  /**
   * Register a listener for Telegram viewport changes.
   * Returns an unsubscribe function to remove the listener.
   *
   * @param {Function} callback - Function to call when viewport changes
   * @returns {Function} Unsubscribe function to remove the listener
   */
  public onViewportChanged(callback: () => void): (() => void) | null {
    // Check if Telegram WebApp has viewport change events
    if (WebApp && typeof WebApp.onEvent === 'function') {
      // Register the viewport change event
      WebApp.onEvent('viewportChanged', callback);

      // Return unsubscribe function
      return () => {
        if (typeof WebApp.offEvent === 'function') {
          WebApp.offEvent('viewportChanged', callback);
        }
      };
    }

    // Return null if viewport events are not available
    return null;
  }
}

export default TelegramService;