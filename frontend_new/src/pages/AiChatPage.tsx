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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
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

const INITIAL_ASSISTANT_MESSAGE =
  "Ask about your spending, income, categories, tags, transaction history, or trends.";

const SUGGESTION_PROMPTS = [
  "How much did I spend this month?",
  "Compare this month with last month.",
  "Show spending by category for the last 30 days.",
];
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
  return [
    {
      createdAt: new Date(),
      id: "assistant-welcome",
      includeInHistory: false,
      role: "assistant",
      text: INITIAL_ASSISTANT_MESSAGE,
    },
  ];
}

function formatMessageTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
  const timelineEndRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
    if (shouldScrollTimelineRef.current) {
      timelineEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
    <section className="flex h-full min-h-0 flex-col gap-4" data-testid="ai-chat-page">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">AI Chat</h2>
          <p className="text-sm text-muted-foreground">
            Get read-only answers grounded in your transactions. Start with a period, category, tag, or trend.
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              aria-label="Start a new AI chat"
              data-testid="ai-chat-reset-trigger"
              size="sm"
              type="button"
              variant="outline"
            >
              <PlusIcon data-icon="inline-start" />
              New chat
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
      </div>

      <div className="flex flex-wrap gap-2" data-testid="ai-chat-suggestions">
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

      <Card className="flex min-h-0 flex-1 flex-col gap-0 py-0">
        <CardHeader className="gap-1 border-b py-4">
          <CardTitle className="text-base">Conversation</CardTitle>
          <CardDescription>Chat is cleared when you start over, leave this view, or reload the app.</CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-4 pt-4">
          <div
            aria-live="polite"
            className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-lg border bg-muted/20 p-3"
            data-testid="ai-chat-timeline"
          >
            {messages.map((message) => (
              <article
                className={cn(
                  "flex max-w-[92%] flex-col gap-2 rounded-lg border p-3",
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
                    <Spinner />
                    {message.text}
                  </p>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap text-sm">{message.text}</p>
                    {message.visual ? <ChatVisual visual={message.visual} /> : null}
                  </>
                )}
                <p className="text-xs text-muted-foreground">{formatMessageTime(message.createdAt)}</p>
              </article>
            ))}
            <div ref={timelineEndRef} />
          </div>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="ai-chat-input">Message</FieldLabel>
              <Textarea
                aria-label="Chat message input"
                className="min-h-24"
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
                placeholder="Ask about spending, trends, categories, tags, or transactions…"
                value={inputValue}
              />
            </Field>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">Enter to send, Shift+Enter for a new line.</p>
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
          </FieldGroup>
        </CardContent>
      </Card>
    </section>
  );
}
