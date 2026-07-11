import { type ReactNode, useRef } from "react";
import {
  ChartPieIcon,
  MessageCircleMoreIcon,
  ReceiptTextIcon,
  SettingsIcon,
  WalletMinimalIcon,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useFallbackModeState } from "@/hooks/useFallbackModeState";
import { useFocusedInputPosition } from "@/hooks/useFocusedInputPosition";
import { useKeyboardOpen } from "@/hooks/useKeyboardOpen";
import { cn } from "@/lib/utils";
import { isTelegramWebAppAvailable } from "@/services/telegram/webapp";

interface AppShellProps {
  children: ReactNode;
}

const NAV_ITEMS = [
  { to: "/transactions", label: "Transactions", icon: ReceiptTextIcon },
  { to: "/analytics", label: "Analytics", icon: ChartPieIcon },
  { to: "/chat", label: "AI Chat", icon: MessageCircleMoreIcon },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

export function AppShell({ children }: AppShellProps): JSX.Element {
  const location = useLocation();
  const isKeyboardOpen = useKeyboardOpen();
  const fallbackMode = useFallbackModeState();
  const mainRef = useRef<HTMLElement>(null);
  const isTelegramHost = isTelegramWebAppAvailable();
  const isPrimaryDestination = ["/", "/transactions", "/analytics", "/chat", "/settings"].includes(
    location.pathname,
  );
  const shouldShowNavigation = !isKeyboardOpen && (!isTelegramHost || isPrimaryDestination);

  useFocusedInputPosition(mainRef);

  return (
    <div
      className={cn(
        "flex w-full flex-col overflow-hidden bg-background text-foreground",
        isTelegramHost ? "max-w-none" : "mx-auto max-w-md md:max-w-4xl",
      )}
      data-testid="app-shell-root"
      style={{
        height: isKeyboardOpen
          ? "var(--tg-viewport-height, 100dvh)"
          : "var(--mt-viewport-stable-height, 100dvh)",
      }}
    >
      {!isTelegramHost ? (
        <header className="sticky top-0 z-20 border-b border-border/80 bg-background/80 px-4 py-3 backdrop-blur-md">
          <div className="flex items-center justify-center gap-2">
            <WalletMinimalIcon aria-hidden className="size-5 text-primary" />
            <h1 className="text-lg font-bold tracking-tight">Money Track</h1>
          </div>
        </header>
      ) : null}

      <main
        ref={mainRef}
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-y-auto px-4",
          isTelegramHost
            ? shouldShowNavigation
              ? "mt-scroll-primary pt-[calc(var(--mt-safe-area-inset-top)+1rem)] pb-[calc(var(--mt-safe-area-inset-bottom)+6rem)]"
              : "mt-scroll-nested pt-[calc(var(--mt-safe-area-inset-top)+1rem)] pb-[calc(var(--mt-safe-area-inset-bottom)+1rem)]"
            : isKeyboardOpen
              ? "mt-scroll-nested py-4 pb-4"
              : "mt-scroll-primary py-4 pb-[calc(var(--mt-safe-area-inset-bottom)+6rem)]",
        )}
        data-testid="app-shell-main"
      >
        {fallbackMode.active ? (
          <Alert className="mb-4 rounded-xl border-border/70 bg-card/70" data-testid="app-shell-fallback-mode">
            <AlertTitle>Fallback mode</AlertTitle>
            <AlertDescription>
              {fallbackMode.reason ?? "Backend is unavailable. Showing limited local data for testing."}
            </AlertDescription>
          </Alert>
        ) : null}
        {children}
      </main>

      {shouldShowNavigation ? (
        <nav
          aria-label="Primary navigation"
          data-testid="app-shell-nav"
          className={cn(
            "fixed inset-x-0 bottom-0 z-20 border-t border-border/80 bg-background/95 px-3 pt-1.5 backdrop-blur-md",
            isKeyboardOpen ? "hidden" : "block",
          )}
        >
          <div
            className="mx-auto flex w-full max-w-md items-center justify-between gap-1 pb-[calc(var(--mt-safe-area-inset-bottom)+0.4rem)] md:max-w-4xl"
            data-testid="app-shell-nav-inner"
          >
            {NAV_ITEMS.map((item) => {
              const isActive =
                location.pathname === item.to ||
                (item.to === "/transactions" && location.pathname === "/");
              const Icon = item.icon;

              return (
                <Link
                  key={item.to}
                  aria-label={`Open ${item.label}`}
                  className={cn(
                    "flex h-14 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] leading-none transition-colors",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                  data-testid={`app-shell-nav-link-${item.to.replace("/", "")}`}
                  to={item.to}
                >
                  <Icon
                    aria-hidden
                    className={cn(
                      "size-4",
                      isActive ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                  <span className={cn(isActive ? "font-bold" : "font-medium")}>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
