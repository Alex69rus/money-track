import type { Category } from "@/types/transactions";

export interface CategoryIconData {
  icon: Category["icon"];
  name: Category["name"];
}

interface CategoryIconGlyphProps {
  category: CategoryIconData | null;
  className: string;
  dataTestId?: string;
  fallbackClassName: string;
  fallbackText?: string;
}

const IGNORED_CATEGORY_INITIAL_WORDS = new Set(["and", "of", "the"]);

function getCategoryInitials(categoryName: string): string | null {
  const words = categoryName.match(/[\p{L}\p{N}]+/gu) ?? [];
  const initials = words
    .filter((word) => !IGNORED_CATEGORY_INITIAL_WORDS.has(word.toLocaleLowerCase()))
    .slice(0, 2)
    .map((word) => Array.from(word)[0]?.toLocaleUpperCase() ?? "")
    .join("");

  return initials || null;
}

export function CategoryIconGlyph({
  category,
  className,
  dataTestId,
  fallbackClassName,
  fallbackText = "?",
}: CategoryIconGlyphProps): JSX.Element {
  const icon = category?.icon?.trim();

  if (icon) {
    return (
      <span aria-hidden className={className} data-testid={dataTestId}>
        {icon}
      </span>
    );
  }

  return (
    <span aria-hidden className={fallbackClassName} data-testid={dataTestId}>
      {category ? getCategoryInitials(category.name) ?? fallbackText : fallbackText}
    </span>
  );
}
