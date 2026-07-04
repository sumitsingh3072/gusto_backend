export interface PreferenceProfile {
  diet: "veg" | "non-veg" | "eggetarian" | "vegan";
  spiceLevel: 1 | 2 | 3 | 4 | 5;
  cuisineFavorites: string[];
  nutritionTags?: string[]; // e.g. "high-protein", "low-carb"
}
