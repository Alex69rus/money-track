import { mapCategory } from "@/services/api/mappers";
import type { CategoryDto } from "@/services/api/dto";
import { apiRequest } from "@/services/api/client";
import type { Category } from "@/types/transactions";

export async function fetchCategories(signal?: AbortSignal): Promise<Category[]> {
  const data = await apiRequest<CategoryDto[]>("/api/categories", { signal });
  return data.map(mapCategory);
}
