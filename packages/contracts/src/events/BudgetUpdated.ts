import { z } from "zod";

export const BudgetUpdatedEventSchema = z.object({
  eventId: z.string().uuid(),
  occurredAt: z.string().datetime(),
  userId: z.string(),
  currentBalance: z.number().nonnegative(),
  dailyAvgLimit: z.number().nonnegative(),
});

export type BudgetUpdatedEvent = z.infer<typeof BudgetUpdatedEventSchema>;

