import { z } from "zod";
import { DecisionLogEntrySchema } from "./DecisionLogEntry";

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
  overBudget: z.boolean(),
  decisionLog: z.array(DecisionLogEntrySchema),
});

export type OptimizedCart = z.infer<typeof OptimizedCartSchema>;

