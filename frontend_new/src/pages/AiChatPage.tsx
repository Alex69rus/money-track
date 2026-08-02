import { useCallback, useEffect, useRef, useState } from "react";
import { PlusIcon, RotateCcwIcon, SendIcon } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ChatVisual } from "@/components/ai-chat/ChatVisual";
import { cn } from "@/lib/utils";
import { ApiRequestError } from "@/services/api/client";
import {
  type ChatHistoryMessage,
  type ChatVisual as ChatVisualData,
  sendChatMessage,
} from "@/services/api/chat";

interface ChatMessage {
  createdAt: Date;
  id: string;
  includeInHistory: boolean;
  pending?: boolean;
  role: "assistant" | "user";
  text: string;
  visual?: ChatVisualData | null;
}

interface FailedRequest {
  history: ChatHistoryMessage[];
  message: string;
  userMessageId: string;
}

const MAX_HISTORY_CHARACTERS = 12_000;
const MAX_HISTORY_MESSAGES = 12;

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError && error.status === 503) {
    return "AI Chat is temporarily unavailable. Please try again.";
  }
  if (error instanceof ApiRequestError) {
    return "AI Chat could not answer that request. Please try again.";
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "AI Chat could not answer that request. Please try again.";
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function buildInitialMessages(): ChatMessage[] {
  return [];
}

function historyFromMessages(messages: ChatMessage[]): ChatHistoryMessage[] {
  const completedMessages = messages
    .filter((message) => message.includeInHistory && !message.pending)
    .map((message) => ({ content: message.text, role: message.role }));
  const completePairs: ChatHistoryMessage[][] = [];

  for (let index = 0; index < completedMessages.length - 1; index += 2) {
    const userMessage = completedMessages[index];
    const assistantMessage = completedMessages[index + 1];
    if (userMessage?.role === "user" && assistantMessage?.role === "assistant") {
      completePairs.push([userMessage, assistantMessage]);
    }
  }

  const boundedHistory: ChatHistoryMessage[] = [];
  let historyCharacters = 0;
  for (const pair of completePairs.reverse()) {
    const pairCharacters = pair.reduce((total, message) => total + message.content.length, 0);
    if (
      boundedHistory.length + pair.length > MAX_HISTORY_MESSAGES ||
      historyCharacters + pairCharacters > MAX_HISTORY_CHARACTERS
    ) {
      break;
    }
    boundedHistory.unshift(...pair);
    historyCharacters += pairCharacters;
  }

  return boundedHistory;
}

export function AiChatPage(): JSX.Element {
  const [messages, setMessages] = useState<ChatMessage[]>(() => buildInitialMessages());
  const [inputValue, setInputValue] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedRequest, setLastFailedRequest] = useState<FailedRequest | null>(null);

  const messageSequenceRef = useRef(0);
  const pendingRequestRef = useRef<AbortController | null>(null);
  const shouldScrollTimelineRef = useRef(false);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
    if (shouldScrollTimelineRef.current) {
      const timeline = timelineRef.current;
      timeline?.scrollTo({ behavior: "smooth", top: timeline.scrollHeight });
    }
  }, [messages]);

  const nextMessageId = useCallback((): string => {
    messageSequenceRef.current += 1;
    return `message-${messageSequenceRef.current.toString()}`;
  }, []);

  const resetChat = useCallback(() => {
    pendingRequestRef.current?.abort();
    pendingRequestRef.current = null;
    setPending(false);
    setError(null);
    setLastFailedRequest(null);
    setInputValue("");
    shouldScrollTimelineRef.current = false;
    setMessages(buildInitialMessages());
  }, []);

  const submitPrompt = useCallback(
    async (
      promptInput: string,
      retryHistory?: ChatHistoryMessage[],
      retryUserMessageId?: string,
    ): Promise<void> => {
      if (pending) {
        return;
      }
      const prompt = promptInput.trim();
      if (!prompt) {
        return;
      }

      const history = retryHistory ?? historyFromMessages(messagesRef.current);
      const requestTimestamp = new Date();
      const isRetry = retryHistory !== undefined;
      const userMessageId = retryUserMessageId ?? (isRetry ? null : nextMessageId());
      const pendingMessageId = nextMessageId();

      setError(null);
      setLastFailedRequest(null);
      setInputValue("");
      shouldScrollTimelineRef.current = true;
      setPending(true);
      setMessages((previous) => [
        ...previous,
        ...(isRetry
          ? []
          : [
              {
                createdAt: requestTimestamp,
                id: userMessageId ?? nextMessageId(),
                includeInHistory: true,
                role: "user" as const,
                text: prompt,
              },
            ]),
        {
          createdAt: requestTimestamp,
          id: pendingMessageId,
          includeInHistory: false,
          pending: true,
          role: "assistant",
          text: "AI is thinking…",
        },
      ]);

      const abortController = new AbortController();
      pendingRequestRef.current = abortController;
      try {
        const response = await sendChatMessage({ history, message: prompt }, abortController.signal);
        if (abortController.signal.aborted) {
          return;
        }
        setMessages((previous) =>
          previous.map((message) =>
            message.id === pendingMessageId
              ? {
                  ...message,
                  createdAt: new Date(),
                  includeInHistory: true,
                  pending: false,
                  text: response.message,
                  visual: response.visual,
                }
              : message.id === retryUserMessageId
                ? { ...message, includeInHistory: true }
              : message,
          ),
        );
      } catch (requestError) {
        if (isAbortError(requestError)) {
          return;
        }
        setMessages((previous) =>
          previous
            .filter((message) => message.id !== pendingMessageId)
            .map((message) =>
              message.id === userMessageId ? { ...message, includeInHistory: false } : message,
            ),
        );
        if (userMessageId) {
          setLastFailedRequest({ history, message: prompt, userMessageId });
        }
        setError(toErrorMessage(requestError));
      } finally {
        if (pendingRequestRef.current === abortController) {
          pendingRequestRef.current = null;
          setPending(false);
        }
      }
    },
    [nextMessageId, pending],
  );

  useEffect(() => {
    return () => {
      pendingRequestRef.current?.abort();
    };
  }, []);

  return (
    <section className="flex h-full min-h-0 flex-col" data-testid="ai-chat-page">
      <header className="flex shrink-0 items-center justify-between gap-3 pb-3" data-testid="ai-chat-header">
        <h2 className="text-base font-semibold tracking-tight">AI Chat</h2>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              aria-label="Start a new AI chat"
              className="size-8 rounded-full border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
              data-testid="ai-chat-reset-trigger"
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <PlusIcon aria-hidden className="size-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent data-testid="ai-chat-reset-dialog">
            <AlertDialogHeader>
              <AlertDialogTitle>Start a new chat?</AlertDialogTitle>
              <AlertDialogDescription>This clears the current AI Chat conversation.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
              <AlertDialogAction data-testid="ai-chat-reset-confirm" onClick={resetChat} type="button">
                Start new chat
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </header>

      {error ? (
        <Alert className="mb-3 shrink-0" data-testid="ai-chat-error" variant="destructive">
          <AlertTitle>AI response issue</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <span>{error}</span>
            {lastFailedRequest ? (
              <div>
                <Button
                  data-testid="ai-chat-retry-last"
                  disabled={pending}
                  onClick={() => {
                    void submitPrompt(
                      lastFailedRequest.message,
                      lastFailedRequest.history,
                      lastFailedRequest.userMessageId,
                    );
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <RotateCcwIcon data-icon="inline-start" />
                  Retry
                </Button>
              </div>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="min-h-0 flex-1">
        <div
          aria-live="polite"
          className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto overscroll-contain py-2 pr-1"
          data-focus-scroll-container
          data-testid="ai-chat-timeline"
          ref={timelineRef}
        >
          {messages.map((message) => (
            <article
              aria-label={
                message.pending
                  ? "AI Chat is preparing a response"
                  : message.role === "user"
                    ? "Your message"
                    : "AI Chat response"
              }
              className={cn(
                "flex max-w-[88%] flex-col gap-2 rounded-2xl px-3 py-2.5 text-sm",
                message.role === "user"
                  ? "ml-auto rounded-br-md bg-primary text-primary-foreground"
                  : "mr-auto max-w-full rounded-none px-1 py-2 text-foreground",
              )}
              data-message-id={message.id}
              data-role={message.role}
              data-testid={`ai-chat-message-${message.role}`}
              key={message.id}
            >
              {message.pending ? (
                <p className="flex items-center gap-2" data-testid="ai-chat-pending">
                  <Spinner />
                  {message.text}
                </p>
              ) : (
                <>
                  <p className="whitespace-pre-wrap">{message.text}</p>
                  {message.visual ? <ChatVisual visual={message.visual} /> : null}
                </>
              )}
            </article>
          ))}
          <div />
        </div>
      </div>

      <div className="shrink-0 pt-3" data-testid="ai-chat-composer">
        <div className="flex items-end gap-2 rounded-2xl border border-input bg-card p-2 shadow-xs">
          <Textarea
            aria-label="Chat message input"
            className="min-h-10 max-h-28 resize-none border-0 bg-transparent px-2 py-2 shadow-none focus-visible:border-transparent focus-visible:ring-0"
            data-skip-focus-position="true"
            data-testid="ai-chat-input"
            disabled={pending}
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
            placeholder="Ask about your money…"
            value={inputValue}
          />
          <Button
            aria-label="Send chat message"
            className="size-9 rounded-full"
            data-testid="ai-chat-send"
            disabled={pending || inputValue.trim().length === 0}
            onClick={() => {
              void submitPrompt(inputValue);
            }}
            size="icon"
            type="button"
          >
            <SendIcon aria-hidden className="size-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
