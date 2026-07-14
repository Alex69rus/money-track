import { apiRequest } from "@/services/api/client";

const CHAT_ENDPOINT = "/api/chat";
const CHAT_FALLBACK_RESPONSE =
  "I couldn't reach the AI service right now. Please try again in a moment.";
const CHAT_UNRECOGNIZED_RESPONSE =
  "I received your message, but I could not parse the assistant response.";

export interface ChatRequestPayload {
  message: string;
  userId: number;
  sessionId: string;
  timestamp: string;
}

function pickString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function extractTextFromObject(value: Record<string, unknown>): string | null {
  const directFields = ["response", "message", "text", "reply", "answer", "content"];
  for (const field of directFields) {
    const directValue = pickString(value[field]);
    if (directValue) {
      return directValue;
    }
  }

  const nestedFields = ["assistant", "data", "result"];
  for (const field of nestedFields) {
    const nestedValue = value[field];
    if (nestedValue && typeof nestedValue === "object" && !Array.isArray(nestedValue)) {
      const nestedText = extractTextFromObject(nestedValue as Record<string, unknown>);
      if (nestedText) {
        return nestedText;
      }
    }
  }

  return null;
}

function extractChatResponseText(payload: unknown): string | null {
  const directString = pickString(payload);
  if (directString) {
    return directString;
  }

  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return extractTextFromObject(payload as Record<string, unknown>);
  }

  return null;
}

export function getChatFallbackResponse(): string {
  return CHAT_FALLBACK_RESPONSE;
}

export async function sendChatMessage(
  payload: ChatRequestPayload,
  signal?: AbortSignal,
): Promise<string> {
  const responsePayload = await apiRequest<unknown>(CHAT_ENDPOINT, {
    method: "POST",
    body: JSON.stringify(payload),
    signal,
  });

  return extractChatResponseText(responsePayload) ?? CHAT_UNRECOGNIZED_RESPONSE;
}
