import { z } from "zod";

/**
 * This describes coupon-optimization-service's internal contract, not a
 * confirmed Swiggy wire format. Swiggy Builders Club docs for
 * `fetch_food_coupons` do not specify the field-level shape of the
 * response `data` payload -- field names here (discountType, minOrderValue,
 * paymentModes, etc.) are best-guess, reconciled in
 * apps/coupon-optimization-service/src/modules/hacker/mapping/coupon-response.mapper.ts,
 * not here. See coupon-optimization-algorithm-design.md §1/§11.
 */
export const CouponSchema = z.object({
  code: z.string(),
  discountType: z.enum(["flat", "percentage"]),
  discountValue: z.number().int().nonnegative(), // paise if flat, 0-100 if percentage
  maxDiscount: z.number().int().nonnegative().nullable(), // paise cap for percentage coupons; null = uncapped
  minOrderValue: z.number().int().nonnegative(), // paise
  paymentModes: z.array(z.enum(["online", "cod", "wallet"])),
  isApplicable: z.boolean().nullable(), // trust Swiggy's own verdict if present
  expiresAt: z.string().nullable(), // ISO-8601; null = no stated expiry
});

export type Coupon = z.infer<typeof CouponSchema>;
