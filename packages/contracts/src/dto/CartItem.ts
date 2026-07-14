import { z } from "zod";

export const CartItemSchema = z.object({
  itemId: z.string(),
  price: z.number().int().nonnegative(), // integer paise, never floating-point rupees
  quantity: z.number().int().positive(),
});

export type CartItem = z.infer<typeof CartItemSchema>;
