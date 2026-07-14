import { z } from "zod";

export const DecisionLogEntrySchema = z.object({
  couponCode: z.string(), // "none" for the baseline/no-coupon entry
  outcome: z.enum(["accepted", "rejected"]),
  reason: z.string(),
  computedTotal: z.number().int().nonnegative().nullable(), // paise, if computable
});

export type DecisionLogEntry = z.infer<typeof DecisionLogEntrySchema>;
