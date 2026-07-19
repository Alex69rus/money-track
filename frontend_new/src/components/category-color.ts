export interface CategoryIconPalette {
  backgroundColor: string;
  foregroundColor: string;
}

function toHexPair(value: string): string {
  return `${value}${value}`;
}

export function normalizeCategoryHexColor(color: string | null | undefined): string | null {
  const raw = color?.trim() ?? "";
  if (!raw.startsWith("#")) {
    return null;
  }

  const value = raw.slice(1);
  if (/^[0-9a-fA-F]{3}$/.test(value)) {
    return `${toHexPair(value[0] ?? "0")}${toHexPair(value[1] ?? "0")}${toHexPair(value[2] ?? "0")}`.toLowerCase();
  }

  return /^[0-9a-fA-F]{6}$/.test(value) ? value.toLowerCase() : null;
}

function withAlpha(hexColor: string | null, alpha: number, fallback: string): string {
  if (!hexColor) {
    return fallback;
  }

  const red = Number.parseInt(hexColor.slice(0, 2), 16);
  const green = Number.parseInt(hexColor.slice(2, 4), 16);
  const blue = Number.parseInt(hexColor.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function getCategoryIconPalette(
  color: string | null | undefined,
  backgroundAlpha = 0.22,
): CategoryIconPalette {
  const normalizedColor = normalizeCategoryHexColor(color);
  return {
    backgroundColor: withAlpha(normalizedColor, backgroundAlpha, "rgba(45, 140, 255, 0.18)"),
    foregroundColor: normalizedColor ? `#${normalizedColor}` : "#2d8cff",
  };
}
