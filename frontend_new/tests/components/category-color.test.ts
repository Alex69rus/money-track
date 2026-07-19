import { describe, expect, it } from "vitest";
import { getCategoryIconPalette, normalizeCategoryHexColor } from "@/components/category-color";

describe("category color presentation", () => {
  it("normalizes the approved Home beige and creates a matching icon palette", () => {
    expect(normalizeCategoryHexColor("#DCAF83")).toBe("dcaf83");
    expect(getCategoryIconPalette("#DCAF83", 0.16)).toEqual({
      backgroundColor: "rgba(220, 175, 131, 0.16)",
      foregroundColor: "#dcaf83",
    });
  });

  it("keeps the existing blue fallback for missing or invalid category colors", () => {
    expect(normalizeCategoryHexColor("not-a-color")).toBeNull();
    expect(getCategoryIconPalette(null)).toEqual({
      backgroundColor: "rgba(45, 140, 255, 0.18)",
      foregroundColor: "#2d8cff",
    });
  });
});
