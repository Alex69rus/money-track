import { mapCategory } from "@/services/api/mappers";
import type { CategoryDto } from "@/services/api/dto";
import {
  apiRequest,
  canUseControlledFallbackMode,
  isNetworkApiRequestError,
} from "@/services/api/client";
import { getFallbackCategories } from "@/services/api/fallback-data";
import { activateFallbackMode } from "@/services/api/fallback-mode";
import type { Category } from "@/types/transactions";

export async function fetchCategories(signal?: AbortSignal): Promise<Category[]> {
  try {
    const data = await apiRequest<CategoryDto[]>("/api/categories", { signal });
    return data.map(mapCategory);
  } catch (error) {
    if (canUseControlledFallbackMode() && isNetworkApiRequestError(error)) {
      activateFallbackMode("Backend is unreachable. Showing local fallback data.");
      return getFallbackCategories();
    }

    throw error;
  }
}
