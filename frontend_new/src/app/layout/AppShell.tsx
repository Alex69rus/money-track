import { type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useKeyboardOpen } from "@/hooks/useKeyboardOpen";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: ReactNode;
}

const NAV_ITEMS = [
  { to: "/transactions", label: "Transactions" },
  { to: "/analytics", label: "Analytics" },
  { to: "/chat", label: "AI Chat" },
  { to: "/settings", label: "Settings" },
] as const;

export function AppShell({ children }: AppShellProps): JSX.Element {
  const location = useLocation();
  const isKeyboardOpen = useKeyboardOpen();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b bg-background/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-center">
          <h1 className="text-lg font-semibold tracking-tight">Money Track</h1>
        </div>
      </header>

      <main className={cn("flex-1 px-4 py-4", isKeyboardOpen ? "pb-4" : "pb-24")}>
        {children}
      </main>

      <nav
        aria-label="Primary navigation"
        className={cn(
          "fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 px-2 pt-2 backdrop-blur",
          isKeyboardOpen ? "hidden" : "block",
        )}
      >
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-1 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
          {NAV_ITEMS.map((item) => {
            const isActive =
              location.pathname === item.to ||
              (item.to === "/transactions" && location.pathname === "/");

            return (
              <Link
                key={item.to}
                aria-label={`Open ${item.label}`}
                className={cn(
                  "flex h-11 flex-1 items-center justify-center rounded-md px-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                to={item.to}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

