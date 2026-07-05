import { z } from "zod";

export const MealSkippedEventSchema = z.object({
  eventId: z.string().uuid(),
  occurredAt: z.string().datetime(),
  userId: z.string(),
  reason: z.string().optional(),
});

export type MealSkippedEvent = z.infer<typeof MealSkippedEventSchema>;

