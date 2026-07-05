import { z } from "zod";

export const RolloverAppliedEventSchema = z.object({
  eventId: z.string().uuid(),
  occurredAt: z.string().datetime(),
  userId: z.string(),
  rolloverAmount: z.number().nonnegative(),
  newDailyLimit: z.number().nonnegative(),
});

export type RolloverAppliedEvent = z.infer<typeof RolloverAppliedEventSchema>;

