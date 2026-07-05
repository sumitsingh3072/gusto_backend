import { z } from "zod";

export const OptimizedCartSchema = z.object({
  items: z.array(
    z.object({
      itemId: z.string(),
      quantity: z.number().int().positive(),
    })
  ),
  baseCost: z.number().nonnegative(),
  fillerCost: z.number().nonnegative(),
  discountApplied: z.number().nonnegative(),
  finalTotal: z.number().nonnegative(),
  savingsAchieved: z.number().nonnegative(),
  couponCode: z.string().optional(),
});

export type OptimizedCart = z.infer<typeof OptimizedCartSchema>;

