import { canUseControlledFallbackMode } from "@/services/api/client";

export interface FallbackModeState {
  active: boolean;
  reason: string | null;
}

type FallbackModeListener = (state: FallbackModeState) => void;

const listeners = new Set<FallbackModeListener>();
let fallbackModeState: FallbackModeState = {
  active: false,
  reason: null,
};

function notifyListeners(): void {
  listeners.forEach((listener) => listener(fallbackModeState));
}

export function activateFallbackMode(reason: string): void {
  if (!canUseControlledFallbackMode()) {
    return;
  }

  if (fallbackModeState.active && fallbackModeState.reason === reason) {
    return;
  }

  fallbackModeState = {
    active: true,
    reason,
  };
  notifyListeners();
}

export function getFallbackModeState(): FallbackModeState {
  return fallbackModeState;
}

export function subscribeFallbackMode(listener: FallbackModeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function resetFallbackModeForTests(): void {
  fallbackModeState = {
    active: false,
    reason: null,
  };
  notifyListeners();
}
