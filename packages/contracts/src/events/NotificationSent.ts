import { z } from "zod";

export const NotificationSentEventSchema = z.object({
  eventId: z.string().uuid(),
  occurredAt: z.string().datetime(),
  userId: z.string(),
  notificationType: z.string(),
  channel: z.enum(["push", "sms", "email"]),
});

export type NotificationSentEvent = z.infer<typeof NotificationSentEventSchema>;

