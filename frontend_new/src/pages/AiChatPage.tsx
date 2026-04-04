import { getChatStubInfo } from "@/services/api/chat";

export function AiChatPage(): JSX.Element {
  const chatStub = getChatStubInfo();

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold tracking-tight">AI Chat</h2>
      <p className="text-sm text-muted-foreground">
        This screen is intentionally stubbed for now and will be connected through
        <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">VITE_API_BASE_URL</code>
        endpoint
        <code className="ml-1 rounded bg-muted px-1 py-0.5 text-xs">/api/chat</code>.
      </p>
      <div className="rounded-md border bg-card p-3 text-xs text-muted-foreground">
        Stub status: {chatStub.status}, target: {chatStub.target}
      </div>
    </section>
  );
}

