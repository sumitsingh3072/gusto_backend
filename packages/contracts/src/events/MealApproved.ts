import { z } from "zod";

export const MealApprovedEventSchema = z.object({
  eventId: z.string().uuid(),
  occurredAt: z.string().datetime(),
  userId: z.string(),
  itemId: z.string(),
  restaurantId: z.string(),
  price: z.number().positive(),
  name: z.string(),
});

export type MealApprovedEvent = z.infer<typeof MealApprovedEventSchema>;

