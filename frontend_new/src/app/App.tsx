import { useCallback, useEffect } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { AppShell } from "@/app/layout/AppShell";
import { AnalyticsPage } from "@/pages/AnalyticsPage";
import { AiChatPage } from "@/pages/AiChatPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { TransactionsPage } from "@/pages/TransactionsPage";
import {
  initializeTelegramWebApp,
  subscribeTelegramFullscreenLock,
  subscribeTelegramThemeChanges,
  subscribeTelegramViewportChanges,
} from "@/services/telegram/webapp";
import { useTelegramBackButton } from "@/services/telegram/navigation";

interface NavigationState {
  mtReturnPath?: string;
}

function hasReturnPath(state: unknown): state is NavigationState {
  return typeof state === "object" && state !== null && "mtReturnPath" in state;
}

function TelegramRouteNavigation(): null {
  const location = useLocation();
  const navigate = useNavigate();
  const isPrimaryDestination = ["/", "/transactions", "/analytics", "/chat", "/settings"].includes(
    location.pathname,
  );

  const handleBack = useCallback(() => {
    if (hasReturnPath(location.state) && location.state.mtReturnPath) {
      navigate(-1);
      return;
    }

    navigate("/transactions", { replace: true });
  }, [location.state, navigate]);

  useTelegramBackButton({
    enabled: !isPrimaryDestination,
    onBack: handleBack,
  });

  return null;
}

export default function App(): JSX.Element {
  useEffect(() => {
    initializeTelegramWebApp();
    const unsubscribeTheme = subscribeTelegramThemeChanges(() => undefined);
    const unsubscribeViewport = subscribeTelegramViewportChanges(() => undefined);
    const unsubscribeFullscreen = subscribeTelegramFullscreenLock();
    return () => {
      unsubscribeTheme();
      unsubscribeViewport();
      unsubscribeFullscreen();
    };
  }, []);

  return (
    <AppShell>
      <TelegramRouteNavigation />
      <Routes>
        <Route element={<Navigate replace to="/transactions" />} path="/" />
        <Route element={<TransactionsPage />} path="/transactions/*" />
        <Route element={<AnalyticsPage />} path="/analytics/*" />
        <Route element={<AiChatPage />} path="/chat" />
        <Route element={<SettingsPage />} path="/settings" />
        <Route element={<Navigate replace to="/transactions" />} path="*" />
      </Routes>
    </AppShell>
  );
}
