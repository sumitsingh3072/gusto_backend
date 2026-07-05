import { z } from "zod";

export const UserAuthenticatedEventSchema = z.object({
  eventId: z.string().uuid(),
  occurredAt: z.string().datetime(),
  userId: z.string(),
});

export type UserAuthenticatedEvent = z.infer<typeof UserAuthenticatedEventSchema>;

