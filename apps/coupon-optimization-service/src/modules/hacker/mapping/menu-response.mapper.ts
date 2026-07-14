import { z } from "zod";
import { FillerCandidate } from "@gusto/contracts";
import { createLogger } from "@gusto/logger";

const logger = createLogger("coupon-optimization-service:menu-response-mapper");

/**
 * Best-guess shape for a single get_restaurant_menu item. Swiggy's docs
 * (.agents/rules/swiggy_get_restaurant_menu.md) confirm the response is a
 * "COMPACT view with dish names, prices, and flags (hasVariants,
 * hasAddons)" paginated by category -- but do NOT confirm a `category`
 * field on individual items, which the design doc's §4.4 tiebreak assumes
 * exists. Mapped as optional here; treat any tiebreak relying on it as a
 * soft preference only, never a hard requirement (matches §4.4).
 */
const RawMenuItemSchema = z.object({
  itemId: z.string(),
  price: z.coerce.number().int().positive(), // §8 row 20: coerce string-typed money
  category: z.string().optional(),
  inStock: z.boolean().catch(true),
});

const RawMenuResponseSchema = z
  .object({
    items: z.array(z.unknown()).optional(),
    categories: z
      .array(
        z.object({
          items: z.array(z.unknown()).optional(),
        }),
      )
      .optional(),
  })
  .passthrough();

/**
 * Maps a raw `get_restaurant_menu` page response into `FillerCandidate[]`.
 * Drops individual malformed records without aborting the whole page
 * (§8 row 5/13) and rejects non-positive prices at this boundary.
 */
export function mapMenuResponseToFillerCandidates(raw: unknown): FillerCandidate[] {
  const envelope = RawMenuResponseSchema.safeParse(raw);
  if (!envelope.success) {
    logger.debug({ raw }, "get_restaurant_menu response did not match expected shape");
    return [];
  }

  const flatItems = [
    ...(envelope.data.items ?? []),
    ...(envelope.data.categories ?? []).flatMap((category) => category.items ?? []),
  ];

  const candidates: FillerCandidate[] = [];
  for (const item of flatItems) {
    const parsed = RawMenuItemSchema.safeParse(item);
    if (parsed.success) {
      candidates.push(parsed.data);
    } else {
      logger.debug({ item }, "dropped malformed menu item record");
    }
  }
  return candidates;
}
