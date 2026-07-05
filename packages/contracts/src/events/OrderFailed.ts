import { z } from "zod";

export const OrderFailedEventSchema = z.object({
  eventId: z.string().uuid(),
  occurredAt: z.string().datetime(),
  userId: z.string(),
  orderId: z.string(),
  reason: z.string(),
});

export type OrderFailedEvent = z.infer<typeof OrderFailedEventSchema>;

