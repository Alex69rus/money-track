import { Component, lazy, Suspense, type ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

const AiChatPage = lazy(() => import("@/pages/AiChatPage").then((module) => ({ default: module.AiChatPage })));

class ChatLoadBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  render(): ReactNode {
    if (this.state.failed) {
      return (
        <Alert>
          <AlertTitle>Could not open AI Chat</AlertTitle>
          <AlertDescription>
            <p>Check your connection and reload to try again.</p>
            <Button onClick={() => window.location.reload()} type="button" variant="outline">
              Reload AI Chat
            </Button>
          </AlertDescription>
        </Alert>
      );
    }
    return this.props.children;
  }
}

export function ChatRoute(): JSX.Element {
  return (
    <ChatLoadBoundary>
      <Suspense fallback={
        <div className="flex items-center gap-2 py-4" role="status">
          <Spinner aria-hidden="true" />
          <p>Loading AI Chat…</p>
        </div>
      }>
        <AiChatPage />
      </Suspense>
    </ChatLoadBoundary>
  );
}
