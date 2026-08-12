import { parseChatVisual, type ChatVisual } from "@/services/api/chat";
import { getTelegramWebApp } from "@/services/telegram/webapp";

export interface AiChatMessage {
  createdAt: Date;
  id: string;
  includeInHistory: boolean;
  pending?: boolean;
  role: "assistant" | "user";
  text: string;
  visual?: ChatVisual | null;
}

interface CachedChatMessage {
  text: string;
  visual?: ChatVisual | null;
}

interface CachedChatPair {
  assistant: CachedChatMessage;
  user: CachedChatMessage;
}

interface CachedChatSnapshot {
  pairs: CachedChatPair[];
  version: 1;
}

const CACHE_VERSION = 1;
const CACHE_KEY_PREFIX = "money-track:ai-chat";
const MAX_CACHED_PAIRS = 12;
const MAX_SNAPSHOT_CHARACTERS = 96_000;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function storageScope(): string {
  const userId = getTelegramWebApp()?.initDataUnsafe?.user?.id;
  return typeof userId === "number" && Number.isSafeInteger(userId) && userId > 0
    ? `telegram-${userId.toString()}`
    : "anonymous";
}

export function aiChatCacheKey(): string {
  return `${CACHE_KEY_PREFIX}:v${CACHE_VERSION.toString()}:${storageScope()}`;
}

function localStorageOrNull(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function parseCachedMessage(value: unknown, allowsVisual: boolean): CachedChatMessage | null {
  const message = asRecord(value);
  if (!message || !isText(message.text)) {
    return null;
  }

  if (!allowsVisual) {
    return { text: message.text };
  }

  if (!("visual" in message) || message.visual === null) {
    return { text: message.text, visual: null };
  }

  const visual = parseChatVisual(message.visual);
  return visual ? { text: message.text, visual } : null;
}

function parseCachedSnapshot(value: unknown): CachedChatSnapshot | null {
  const snapshot = asRecord(value);
  if (!snapshot || snapshot.version !== CACHE_VERSION || !Array.isArray(snapshot.pairs)) {
    return null;
  }

  const pairs: CachedChatPair[] = [];
  for (const valuePair of snapshot.pairs) {
    const pair = asRecord(valuePair);
    const user = pair ? parseCachedMessage(pair.user, false) : null;
    const assistant = pair ? parseCachedMessage(pair.assistant, true) : null;
    if (!user || !assistant) {
      return null;
    }
    pairs.push({ assistant, user });
  }

  return { pairs: pairs.slice(-MAX_CACHED_PAIRS), version: CACHE_VERSION };
}

function completedPairs(messages: readonly AiChatMessage[]): CachedChatPair[] {
  const completed = messages.filter((message) => message.includeInHistory && !message.pending);
  const pairs: CachedChatPair[] = [];

  for (let index = 0; index < completed.length - 1; index += 2) {
    const user = completed[index];
    const assistant = completed[index + 1];
    if (user?.role !== "user" || assistant?.role !== "assistant") {
      continue;
    }
    pairs.push({
      assistant: { text: assistant.text, visual: assistant.visual ?? null },
      user: { text: user.text },
    });
  }

  return pairs;
}

function serializedSnapshot(pairs: CachedChatPair[]): string | null {
  try {
    const snapshot: CachedChatSnapshot = { pairs, version: CACHE_VERSION };
    const serialized = JSON.stringify(snapshot);
    return serialized.length <= MAX_SNAPSHOT_CHARACTERS ? serialized : null;
  } catch {
    return null;
  }
}

export function loadAiChatMessages(): AiChatMessage[] {
  const storage = localStorageOrNull();
  if (!storage) {
    return [];
  }

  const key = aiChatCacheKey();
  let serialized: string | null;
  try {
    serialized = storage.getItem(key);
  } catch {
    return [];
  }
  if (!serialized || serialized.length > MAX_SNAPSHOT_CHARACTERS) {
    return [];
  }

  try {
    const snapshot = parseCachedSnapshot(JSON.parse(serialized));
    if (!snapshot) {
      clearAiChatCache();
      return [];
    }

    const createdAt = new Date();
    return snapshot.pairs.flatMap((pair, index) => [
      {
        createdAt,
        id: `restored-${index.toString()}-user`,
        includeInHistory: true,
        role: "user" as const,
        text: pair.user.text,
      },
      {
        createdAt,
        id: `restored-${index.toString()}-assistant`,
        includeInHistory: true,
        role: "assistant" as const,
        text: pair.assistant.text,
        visual: pair.assistant.visual ?? null,
      },
    ]);
  } catch {
    clearAiChatCache();
    return [];
  }
}

export function persistAiChatMessages(messages: readonly AiChatMessage[]): void {
  const storage = localStorageOrNull();
  if (!storage) {
    return;
  }

  const pairs = completedPairs(messages).slice(-MAX_CACHED_PAIRS);
  if (pairs.length === 0) {
    clearAiChatCache();
    return;
  }

  const key = aiChatCacheKey();
  for (let start = 0; start < pairs.length; start += 1) {
    const serialized = serializedSnapshot(pairs.slice(start));
    if (!serialized) {
      continue;
    }
    try {
      storage.setItem(key, serialized);
      return;
    } catch {
      // A quota or privacy restriction must not interrupt the active chat.
    }
  }
}

export function clearAiChatCache(): void {
  const storage = localStorageOrNull();
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(aiChatCacheKey());
  } catch {
    // Cache cleanup is best effort when browser storage is unavailable.
  }
}
