import { z } from "zod";
import { OptimizedCartSchema } from "../dto/OptimizedCart";

export const OrderPlacedEventSchema = z.object({
  eventId: z.string().uuid(),
  occurredAt: z.string().datetime(),
  userId: z.string(),
  orderId: z.string(),
  cart: OptimizedCartSchema,
});

export type OrderPlacedEvent = z.infer<typeof OrderPlacedEventSchema>;

