import { z } from "zod";

export const FillerCandidateSchema = z.object({
  itemId: z.string(),
  price: z.number().int().positive(), // integer paise
  // Not confirmed anywhere in Swiggy's get_restaurant_menu docs -- the
  // response is documented only as dish names/prices/hasVariants/hasAddons.
  // Treated as optional/soft per the design doc's own §4.4 tiebreak rule.
  category: z.string().optional(),
  inStock: z.boolean(),
});

export type FillerCandidate = z.infer<typeof FillerCandidateSchema>;
