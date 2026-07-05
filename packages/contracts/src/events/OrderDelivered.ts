import { z } from "zod";

export const OrderDeliveredEventSchema = z.object({
  eventId: z.string().uuid(),
  occurredAt: z.string().datetime(),
  userId: z.string(),
  orderId: z.string(),
});

export type OrderDeliveredEvent = z.infer<typeof OrderDeliveredEventSchema>;

