import { apiRequest } from "@/services/api/client";

export async function fetchTags(signal?: AbortSignal): Promise<string[]> {
  const data = await apiRequest<string[]>("/api/tags", { signal });
  return data
    .map((tag) => tag.trim())
    .filter((tag, index, source) => tag.length > 0 && source.indexOf(tag) === index)
    .sort((first, second) => first.localeCompare(second));
}
