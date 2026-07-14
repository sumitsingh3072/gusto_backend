import { z } from "zod";
import { CartItemSchema } from "./CartItem";

// Request body for coupon-optimization-service's POST /optimize/cart --
// the real, synchronous trigger from orchestrator-service.
export const OptimizeCartRequestSchema = z.object({
  userId: z.string(),
  restaurantId: z.string(),
  addressId: z.string(),
  cartItems: z.array(CartItemSchema).min(1),
  remainingDailyBudget: z.number().int().nonnegative(), // integer paise
});

export type OptimizeCartRequest = z.infer<typeof OptimizeCartRequestSchema>;
