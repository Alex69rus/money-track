export interface ChatStubInfo {
  status: "stub";
  notes: string;
  target: string;
  endpoint: string;
}

export function getChatStubInfo(): ChatStubInfo {
  return {
    status: "stub",
    notes: "AI Chat redesign screen is intentionally stubbed for now.",
    target: "backend_new",
    endpoint: "/api/chat",
  };
}
