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
}

export default TelegramService;