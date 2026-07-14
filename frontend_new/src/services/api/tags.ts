import {
  apiRequest,
  canUseControlledFallbackMode,
  isNetworkApiRequestError,
} from "@/services/api/client";
import { getFallbackTags } from "@/services/api/fallback-data";
import { activateFallbackMode } from "@/services/api/fallback-mode";

export async function fetchTags(signal?: AbortSignal): Promise<string[]> {
  try {
    const data = await apiRequest<string[]>("/api/tags", { signal });
    return data
      .map((tag) => tag.trim())
      .filter((tag, index, source) => tag.length > 0 && source.indexOf(tag) === index)
      .sort((first, second) => first.localeCompare(second));
  } catch (error) {
    if (canUseControlledFallbackMode() && isNetworkApiRequestError(error)) {
      activateFallbackMode("Backend is unreachable. Showing local fallback data.");
      return getFallbackTags();
    }

    throw error;
  }
}
