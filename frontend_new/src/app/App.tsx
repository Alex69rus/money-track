import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/app/layout/AppShell";
import { AnalyticsPage } from "@/pages/AnalyticsPage";
import { AiChatPage } from "@/pages/AiChatPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { TransactionsPage } from "@/pages/TransactionsPage";
import { initializeTelegramWebApp } from "@/services/telegram/webapp";

export default function App(): JSX.Element {
  useEffect(() => {
    initializeTelegramWebApp();
  }, []);

  return (
    <AppShell>
      <Routes>
        <Route element={<Navigate replace to="/transactions" />} path="/" />
        <Route element={<TransactionsPage />} path="/transactions" />
        <Route element={<AnalyticsPage />} path="/analytics" />
        <Route element={<AiChatPage />} path="/chat" />
        <Route element={<SettingsPage />} path="/settings" />
        <Route element={<Navigate replace to="/transactions" />} path="*" />
      </Routes>
    </AppShell>
  );
}

