import { z } from "zod";

export const MenuItemSchema = z.object({
  itemId: z.string(),
  restaurantId: z.string(),
  name: z.string(),
  price: z.number().positive(),
  description: z.string().optional(),
});

export type MenuItem = z.infer<typeof MenuItemSchema>;

