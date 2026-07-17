import { z } from "zod";
import { FillerCandidate } from "@gusto/contracts";
import { createLogger } from "@gusto/logger";

const logger = createLogger("coupon-optimization-service:menu-response-mapper");

/**
 * Reconciled against a real (docs-faithful) Swiggy response during Phase 2
 * e2e testing (KNOWN_ISSUES.md item 32): each item within a category is
 * keyed `id`, not `itemId` -- confirmed both by the mock (built
 * independently from .agents/rules/swiggy_get_restaurant_menu.md) and by
 * the "Order food end-to-end" recipe's `menu.data.items[0].id` usage in
 * .agents/rules/swiggy_llms.txt (same root cause as
 * orchestrator-service's `fetchMenu` bug, KNOWN_ISSUES.md item 30). Mapped
 * from `id` to this service's internal `itemId` field below. Swiggy's docs
 * do NOT confirm a `category` field on individual items, which the design
 * doc's §4.4 tiebreak assumes exists -- kept optional; any tiebreak relying
 * on it is a soft preference only, never a hard requirement (matches §4.4).
 */
const RawMenuItemSchema = z.object({
  id: z.string(),
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
    if (!parsed.success) {
      logger.debug({ item }, "dropped malformed menu item record");
      continue;
    }
    candidates.push({
      itemId: parsed.data.id,
      price: parsed.data.price,
      category: parsed.data.category,
      inStock: parsed.data.inStock,
    });
  }
  return candidates;
}
