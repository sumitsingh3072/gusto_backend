import { z } from "zod";
import { OptimizedCartSchema } from "../dto/OptimizedCart";

export const CartOptimizedEventSchema = z.object({
  eventId: z.string().uuid(),
  occurredAt: z.string().datetime(),
  userId: z.string(),
  optimizedCart: OptimizedCartSchema,
});

export type CartOptimizedEvent = z.infer<typeof CartOptimizedEventSchema>;

