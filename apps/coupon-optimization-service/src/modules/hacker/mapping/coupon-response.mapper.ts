import { z } from "zod";
import { Coupon } from "@gusto/contracts";
import { createLogger } from "@gusto/logger";

const logger = createLogger("coupon-optimization-service:coupon-response-mapper");

/**
 * Reconciled against a real (docs-faithful) Swiggy response during Phase 2
 * e2e testing (KNOWN_ISSUES.md item 32) -- the "Order food end-to-end"
 * recipe in .agents/rules/swiggy_llms.txt confirms `data` is a FLAT ARRAY
 * (`coupons.data.find((c) => !c.requiresOnlinePayment)`), each item
 * carrying at least `code` and `requiresOnlinePayment` as a plain boolean.
 * Swiggy's docs still don't specify discount composition (flat vs
 * percentage, amount, cap, expiry) at the field level -- those remain
 * best-guess with `.catch()` fallbacks, a genuine residual gap (not
 * something a doc reading alone can resolve) tracked in
 * coupon-optimization-algorithm-design.md §11.
 */
const RawCouponSchema = z.object({
  code: z.string(),
  minCartValue: z.coerce.number().int().nonnegative().catch(0),
  requiresOnlinePayment: z.boolean().catch(false),
  discountType: z.enum(["flat", "percentage"]).catch("flat"),
  discountValue: z.coerce.number().int().nonnegative().catch(0),
  maxDiscount: z.coerce.number().int().nonnegative().nullable().catch(null),
  isApplicable: z.boolean().nullable().catch(null),
  expiresAt: z.string().nullable().catch(null),
});

const RawEnvelopeSchema = z.array(z.unknown());

/**
 * Maps a raw `fetch_food_coupons` response into the service's internal
 * `Coupon[]` contract. Drops individual malformed records without aborting
 * the whole batch (§8 row 5).
 */
export function mapFetchFoodCouponsResponse(raw: unknown): Coupon[] {
  const envelope = RawEnvelopeSchema.safeParse(raw);
  if (!envelope.success) {
    logger.debug({ raw }, "fetch_food_coupons response did not match expected flat-array shape");
    return [];
  }

  const coupons: Coupon[] = [];
  for (const item of envelope.data) {
    const parsed = RawCouponSchema.safeParse(item);
    if (!parsed.success) {
      logger.debug({ item }, "dropped malformed coupon record");
      continue;
    }
    const raw = parsed.data;
    coupons.push({
      code: raw.code,
      discountType: raw.discountType,
      discountValue: raw.discountValue,
      maxDiscount: raw.maxDiscount,
      minOrderValue: raw.minCartValue,
      paymentModes: raw.requiresOnlinePayment ? ["online"] : ["cod"],
      isApplicable: raw.isApplicable,
      expiresAt: raw.expiresAt,
    });
  }
  return coupons;
}
