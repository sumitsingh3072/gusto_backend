import { z } from "zod";

export const ScoutCompletedEventSchema = z.object({
  eventId: z.string().uuid(),
  occurredAt: z.string().datetime(),
  userId: z.string(),
});

export type ScoutCompletedEvent = z.infer<typeof ScoutCompletedEventSchema>;

