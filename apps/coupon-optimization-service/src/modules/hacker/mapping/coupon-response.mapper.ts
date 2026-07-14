import { z } from "zod";
import { Coupon } from "@gusto/contracts";
import { createLogger } from "@gusto/logger";

const logger = createLogger("coupon-optimization-service:coupon-response-mapper");

/**
 * Best-guess shape per coupon-optimization-algorithm-design.md §1/§11 --
 * Swiggy's own `fetch_food_coupons` docs (.agents/rules/swiggy_fetch_food_coupons.md)
 * describe the response only in prose ("includes best coupons, more offers,
 * and payment offers") and never give a field-level schema for `data`.
 * Reconcile this against a real sandbox response before shipping to
 * production traffic -- this is the one file that needs to change if the
 * real shape differs, per the design doc's own reconciliation plan (§11).
 */
const RawCouponSchema = z.object({
  code: z.string(),
  discountType: z.enum(["flat", "percentage"]).catch("flat"),
  discountValue: z.coerce.number().int().nonnegative().catch(0),
  maxDiscount: z.coerce.number().int().nonnegative().nullable().catch(null),
  minOrderValue: z.coerce.number().int().nonnegative().catch(0),
  paymentModes: z.array(z.enum(["online", "cod", "wallet"])).catch([]),
  isApplicable: z.boolean().nullable().catch(null),
  expiresAt: z.string().nullable().catch(null),
});

// The envelope shape is also unconfirmed -- assumed bucketed
// (bestCoupons/moreOffers/paymentOffers) per the tool doc's prose. If the
// real response turns out to be a flat array with a type discriminator
// instead, this is the only function that needs to change (§8 row 22).
const RawEnvelopeSchema = z
  .object({
    bestCoupons: z.array(z.unknown()).optional(),
    moreOffers: z.array(z.unknown()).optional(),
    // Deliberately never mapped into Coupon[] -- payment-instrument offers
    // (bank card/wallet cashback) aren't usable by Gusto's pre-authorized
    // one-tap payment flow. See design doc §2.1.
    paymentOffers: z.array(z.unknown()).optional(),
  })
  .passthrough();

/**
 * Maps a raw `fetch_food_coupons` response into the service's internal
 * `Coupon[]` contract. Drops the entire `paymentOffers` bucket before any
 * `Coupon` object is constructed (§2.1) and drops individual malformed
 * records without aborting the whole batch (§8 row 5).
 */
export function mapFetchFoodCouponsResponse(raw: unknown): Coupon[] {
  const envelope = RawEnvelopeSchema.safeParse(raw);
  if (!envelope.success) {
    logger.debug({ raw }, "fetch_food_coupons response did not match expected envelope shape");
    return [];
  }

  const cartLevelRaw = [...(envelope.data.bestCoupons ?? []), ...(envelope.data.moreOffers ?? [])];
  const coupons: Coupon[] = [];
  for (const item of cartLevelRaw) {
    const parsed = RawCouponSchema.safeParse(item);
    if (parsed.success) {
      coupons.push(parsed.data);
    } else {
      logger.debug({ item }, "dropped malformed coupon record");
    }
  }
  return coupons;
}
