import { afterEach, describe, expect, it, vi } from "vitest";
import {
  aiChatCacheKey,
  clearAiChatCache,
  loadAiChatMessages,
  persistAiChatMessages,
  type AiChatMessage,
} from "@/services/ai-chat-cache";
import type { TelegramWebApp } from "@/services/telegram/webapp";

interface TelegramTestWindow extends Window {
  Telegram?: {
    WebApp?: TelegramWebApp;
  };
}

function telegramTestWindow(): TelegramTestWindow {
  return window as TelegramTestWindow;
}

function pair(index: number): AiChatMessage[] {
  return [
    {
      createdAt: new Date(),
      id: `user-${index.toString()}`,
      includeInHistory: true,
      role: "user",
      text: `Question ${index.toString()}`,
    },
    {
      createdAt: new Date(),
      id: `assistant-${index.toString()}`,
      includeInHistory: true,
      role: "assistant",
      text: `Answer ${index.toString()}`,
      visual: null,
    },
  ];
}

describe("AI Chat local cache", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    delete telegramTestWindow().Telegram;
  });

  it("drops a malformed or old snapshot without throwing", () => {
    window.localStorage.setItem(aiChatCacheKey(), "not json");
    expect(loadAiChatMessages()).toEqual([]);
    expect(window.localStorage.getItem(aiChatCacheKey())).toBeNull();

    window.localStorage.setItem(aiChatCacheKey(), JSON.stringify({ pairs: [], version: 0 }));
    expect(loadAiChatMessages()).toEqual([]);
    expect(window.localStorage.getItem(aiChatCacheKey())).toBeNull();
  });

  it("rejects malformed stored visuals instead of rendering untrusted cache data", () => {
    window.localStorage.setItem(
      aiChatCacheKey(),
      JSON.stringify({
        pairs: [{ assistant: { text: "Answer", visual: { kind: "table" } }, user: { text: "Question" } }],
        version: 1,
      }),
    );

    expect(loadAiChatMessages()).toEqual([]);
  });

  it("retains only the newest twelve complete pairs", () => {
    persistAiChatMessages(Array.from({ length: 13 }, (_, index) => pair(index + 1)).flat());

    const restored = loadAiChatMessages();
    expect(restored).toHaveLength(24);
    expect(restored[0]?.text).toBe("Question 2");
    expect(restored[23]?.text).toBe("Answer 13");
  });

  it("scopes the local cache by Telegram user only as a local cache namespace", () => {
    const webApp: TelegramWebApp = {
      expand: () => undefined,
      initData: "",
      initDataUnsafe: { user: { id: 42 } },
      ready: () => undefined,
    };
    telegramTestWindow().Telegram = { WebApp: webApp };

    persistAiChatMessages(pair(1));
    expect(aiChatCacheKey()).toContain("telegram-42");

    webApp.initDataUnsafe = { user: { id: 43 } };
    expect(aiChatCacheKey()).toContain("telegram-43");
    expect(loadAiChatMessages()).toEqual([]);
  });

  it("ignores incomplete and failed entries", () => {
    persistAiChatMessages([
      ...pair(1),
      {
        createdAt: new Date(),
        id: "failed",
        includeInHistory: false,
        role: "user",
        text: "Failed question",
      },
      {
        createdAt: new Date(),
        id: "pending",
        includeInHistory: false,
        pending: true,
        role: "assistant",
        text: "AI is thinking…",
      },
    ]);

    expect(loadAiChatMessages().map((message) => message.text)).toEqual(["Question 1", "Answer 1"]);
  });

  it("keeps the active chat usable when local storage writes and removal fail", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });
    const removeItem = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new DOMException("Storage unavailable", "SecurityError");
    });

    expect(() => persistAiChatMessages(pair(1))).not.toThrow();
    expect(() => clearAiChatCache()).not.toThrow();
    expect(setItem).toHaveBeenCalled();
    expect(removeItem).toHaveBeenCalled();
  });

  it("starts with an empty in-memory chat when browser storage cannot be read", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Storage unavailable", "SecurityError");
    });

    expect(() => loadAiChatMessages()).not.toThrow();
    expect(loadAiChatMessages()).toEqual([]);
  });
});
