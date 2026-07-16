import { z } from "zod";

export const PreferenceProfileSchema = z.object({
  diet: z.enum(["veg", "non-veg", "eggetarian", "vegan"]),
  spiceLevel: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  cuisineFavorites: z.array(z.string()),
  nutritionTags: z.array(z.string()).optional(),
  defaultAddressId: z.string().optional(),
  defaultRestaurantId: z.string().optional(),
});

export type PreferenceProfile = z.infer<typeof PreferenceProfileSchema>;

