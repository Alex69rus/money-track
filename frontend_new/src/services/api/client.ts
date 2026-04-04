import { getTelegramInitData } from "@/services/telegram/webapp";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ?? "";

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Init-Data": getTelegramInitData(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Request failed (${response.status}): ${details || response.statusText}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
