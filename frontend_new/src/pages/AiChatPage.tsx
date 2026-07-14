import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircleIcon, RotateCcwIcon, SendIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ApiRequestError } from "@/services/api/client";
import { getChatFallbackResponse, sendChatMessage } from "@/services/api/chat";
import { getTelegramWebApp } from "@/services/telegram/webapp";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
  createdAt: Date;
  pending?: boolean;
  fallback?: boolean;
}

const INITIAL_ASSISTANT_MESSAGE =
  "Hello! I'm your AI financial assistant. Ask anything about your spending, trends, and transactions.";

const SUGGESTION_PROMPTS = [
  "How much did I spend this month?",
  "What are my top spending categories?",
  "Show unusual expenses from the last 7 days.",
];

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Failed to get AI response.";
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function createSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildInitialMessages(): ChatMessage[] {
  return [
    {
      id: "assistant-welcome",
      role: "assistant",
      text: INITIAL_ASSISTANT_MESSAGE,
      createdAt: new Date(),
    },
  ];
}

function formatMessageTime(date: Date): string {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AiChatPage(): JSX.Element {
  const [messages, setMessages] = useState<ChatMessage[]>(() => buildInitialMessages());
  const [inputValue, setInputValue] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState(() => createSessionId());
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);

  const messageSequenceRef = useRef(0);
  const pendingRequestRef = useRef<AbortController | null>(null);
  const timelineEndRef = useRef<HTMLDivElement | null>(null);

  const userId = useMemo(() => getTelegramWebApp()?.initDataUnsafe?.user?.id ?? 1, []);

  const nextMessageId = useCallback((): string => {
    messageSequenceRef.current += 1;
    return `message-${messageSequenceRef.current.toString()}`;
  }, []);

  const resetChat = useCallback(() => {
    pendingRequestRef.current?.abort();
    pendingRequestRef.current = null;
    setPending(false);
    setError(null);
    setLastFailedPrompt(null);
    setInputValue("");
    setSessionId(createSessionId());
    setMessages(buildInitialMessages());
  }, []);

  const submitPrompt = useCallback(
    async (promptInput: string): Promise<void> => {
      if (pending) {
        return;
      }

      const prompt = promptInput.trim();
      if (!prompt) {
        return;
      }

      const requestTimestamp = new Date();
      const userMessageId = nextMessageId();
      const pendingMessageId = nextMessageId();

      setError(null);
      setLastFailedPrompt(null);
      setInputValue("");
      setPending(true);
      setMessages((previous) => [
        ...previous,
        {
          id: userMessageId,
          role: "user",
          text: prompt,
          createdAt: requestTimestamp,
        },
        {
          id: pendingMessageId,
          role: "assistant",
          text: "AI is thinking...",
          createdAt: requestTimestamp,
          pending: true,
        },
      ]);

      const abortController = new AbortController();
      pendingRequestRef.current = abortController;

      try {
        const assistantResponse = await sendChatMessage(
          {
            message: prompt,
            userId,
            sessionId,
            timestamp: requestTimestamp.toISOString(),
          },
          abortController.signal,
        );

        if (abortController.signal.aborted) {
          return;
        }

        setMessages((previous) =>
          previous.map((message) =>
            message.id === pendingMessageId
              ? {
                  ...message,
                  text: assistantResponse,
                  pending: false,
                  createdAt: new Date(),
                }
              : message,
          ),
        );
      } catch (requestError) {
        if (isAbortError(requestError)) {
          return;
        }

        const fallbackResponse = getChatFallbackResponse();
        setLastFailedPrompt(prompt);
        setError(`${toErrorMessage(requestError)} Showing fallback response.`);
        setMessages((previous) =>
          previous.map((message) =>
            message.id === pendingMessageId
              ? {
                  ...message,
                  text: fallbackResponse,
                  pending: false,
                  fallback: true,
                  createdAt: new Date(),
                }
              : message,
          ),
        );
      } finally {
        if (!abortController.signal.aborted) {
          setPending(false);
        }

        if (pendingRequestRef.current === abortController) {
          pendingRequestRef.current = null;
        }
      }
    },
    [nextMessageId, pending, sessionId, userId],
  );

  useEffect(() => {
    timelineEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => {
      pendingRequestRef.current?.abort();
    };
  }, []);

  return (
    <section className="flex h-full flex-col gap-4" data-testid="ai-chat-page">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">AI Chat</h2>
          <p className="text-sm text-muted-foreground">
            Ask questions about your finances. Requests are sent to
            <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">/api/chat</code>
            through
            <code className="ml-1 rounded bg-muted px-1 py-0.5 text-xs">VITE_API_BASE_URL</code>.
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              aria-label="Reset AI chat session"
              data-testid="ai-chat-reset-trigger"
              size="sm"
              type="button"
              variant="outline"
            >
              <RotateCcwIcon data-icon="inline-start" />
              Reset
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent data-testid="ai-chat-reset-dialog">
            <AlertDialogHeader>
              <AlertDialogTitle>Reset chat session</AlertDialogTitle>
              <AlertDialogDescription>
                This clears conversation history and starts a new AI chat session.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
              <AlertDialogAction
                data-testid="ai-chat-reset-confirm"
                onClick={() => {
                  resetChat();
                }}
                type="button"
              >
                Reset session
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="flex flex-wrap gap-2">
        {SUGGESTION_PROMPTS.map((prompt) => (
          <Button
            data-testid={`ai-chat-suggestion-${prompt.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
            disabled={pending}
            key={prompt}
            onClick={() => {
              void submitPrompt(prompt);
            }}
            size="sm"
            type="button"
            variant="secondary"
          >
            {prompt}
          </Button>
        ))}
      </div>

      {error ? (
        <Alert data-testid="ai-chat-error" variant="destructive">
          <AlertTitle>AI response issue</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <span>{error}</span>
            {lastFailedPrompt ? (
              <div>
                <Button
                  data-testid="ai-chat-retry-last"
                  disabled={pending}
                  onClick={() => {
                    void submitPrompt(lastFailedPrompt);
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Retry last prompt
                </Button>
              </div>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <Card className="flex min-h-0 flex-1 flex-col">
        <CardHeader className="gap-2">
          <CardTitle className="text-base">Conversation</CardTitle>
          <CardDescription className="flex items-center gap-2">
            <span>Session id:</span>
            <Badge data-testid="ai-chat-session-id" variant="secondary">
              {sessionId}
            </Badge>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
          <div
            aria-live="polite"
            className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-lg border bg-muted/20 p-3"
            data-testid="ai-chat-timeline"
          >
            {messages.map((message) => (
              <article
                className={cn(
                  "flex max-w-[92%] flex-col gap-1 rounded-lg border p-3",
                  message.role === "user"
                    ? "ml-auto border-primary/40 bg-primary/10 text-right"
                    : "mr-auto border-border bg-card text-left",
                )}
                data-message-id={message.id}
                data-role={message.role}
                data-testid={`ai-chat-message-${message.role}`}
                key={message.id}
              >
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {message.role === "user" ? "You" : "Assistant"}
                </p>
                {message.pending ? (
                  <p className="flex items-center gap-2 text-sm" data-testid="ai-chat-pending">
                    <LoaderCircleIcon className="animate-spin" />
                    {message.text}
                  </p>
                ) : (
                  <p
                    className="whitespace-pre-wrap text-sm"
                    data-testid={message.fallback ? "ai-chat-fallback" : undefined}
                  >
                    {message.text}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">{formatMessageTime(message.createdAt)}</p>
              </article>
            ))}
            <div ref={timelineEndRef} />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="ai-chat-input">
              Message
            </label>
            <Textarea
              aria-label="Chat message input"
              className="min-h-24"
              data-testid="ai-chat-input"
              id="ai-chat-input"
              onChange={(event) => {
                setInputValue(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void submitPrompt(inputValue);
                }
              }}
              placeholder="Ask about spending, trends, or suspicious transactions..."
              value={inputValue}
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">Enter to send, Shift+Enter for new line.</p>
              <Button
                aria-label="Send chat message"
                data-testid="ai-chat-send"
                disabled={pending || inputValue.trim().length === 0}
                onClick={() => {
                  void submitPrompt(inputValue);
                }}
                type="button"
              >
                <SendIcon data-icon="inline-start" />
                Send
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
