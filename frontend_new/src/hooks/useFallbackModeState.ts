import { useSyncExternalStore } from "react";
import {
  getFallbackModeState,
  subscribeFallbackMode,
  type FallbackModeState,
} from "@/services/api/fallback-mode";

export function useFallbackModeState(): FallbackModeState {
  return useSyncExternalStore(subscribeFallbackMode, getFallbackModeState, getFallbackModeState);
}
