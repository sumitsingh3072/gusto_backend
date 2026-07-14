import { CartItem, Coupon, FillerCandidate, DecisionLogEntry } from "@gusto/contracts";

/**
 * Pure function implementation of the "Hacker" logic from the product spec:
 *
 *   Total = min(B, (B + ΣFillers) - D)
 *
 * Given base cost B and coupon threshold T:
 *   1. If B < T, gap = T - B
 *   2. Search menu for a filler item whose cost closes the gap (B + filler >= T)
 *   3. If (B + filler cost) - D < B, add the filler to the cart
 *   4. Result: a free side/drink AND a lower total than the original meal
 *
 * Deliberately has zero I/O -- keeps the core money-math unit-testable
 * without mocking HTTP. See coupon-optimization-algorithm-design.md for the
 * full spec this implements (§3-§8).
 */

export interface OptimizationInput {
  cartItems: CartItem[];
  coupons: Coupon[];
  fillerCandidates: FillerCandidate[];
  remainingDailyBudget: number; // integer paise, hard ceiling
  now: Date; // injected, not Date.now(), for determinism in tests
}

export interface OptimizationResult {
  finalItems: { itemId: string; quantity: number }[];
  appliedCouponCode: string | null;
  baseTotal: number; // B, paise
  finalTotal: number; // paise
  savingsAchieved: number; // baseTotal - finalTotal, paise, >= 0
  overBudget: boolean; // true if finalTotal > remainingDailyBudget
  decisionLog: DecisionLogEntry[];
}

interface Contender {
  couponCode: string | null;
  items: { itemId: string; quantity: number }[];
  total: number;
  fillersAdded: string[];
}

const FILLER_TIEBREAK_CATEGORIES = new Set(["side", "beverage", "dessert"]);

export class HackerAlgorithm {
  optimize(input: OptimizationInput): OptimizationResult {
    const { cartItems, coupons, remainingDailyBudget, now } = input;

    const baseTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const baselineItems = cartItems.map((item) => ({ itemId: item.itemId, quantity: item.quantity }));

    // §8 row 1: empty cart -- return baseline immediately, no coupon search.
    if (cartItems.length === 0 || baseTotal === 0) {
      return this.buildResult(
        { couponCode: null, items: baselineItems, total: baseTotal, fillersAdded: [] },
        baseTotal,
        remainingDailyBudget,
        [],
      );
    }

    const affordableFillerBudget = remainingDailyBudget - baseTotal;
    const sortedFillerCandidates = this.prepareFillerCandidates(input.fillerCandidates, affordableFillerBudget);

    const decisionLog: DecisionLogEntry[] = [];
    const contenders: Contender[] = [
      { couponCode: null, items: baselineItems, total: baseTotal, fillersAdded: [] },
    ];

    for (const coupon of coupons) {
      const eligibility = this.checkEligibility(coupon, baseTotal, now, affordableFillerBudget);
      if (!eligibility.eligible) {
        decisionLog.push({
          couponCode: coupon.code,
          outcome: "rejected",
          reason: eligibility.reason,
          computedTotal: null,
        });
        continue;
      }

      const outcome = this.optimizeSingleCoupon(
        coupon,
        baselineItems,
        baseTotal,
        sortedFillerCandidates,
        remainingDailyBudget,
      );
      decisionLog.push(outcome.logEntry);
      if (outcome.contender) {
        contenders.push(outcome.contender);
      }
    }

    const winner = this.selectWinner(contenders);
    return this.buildResult(winner, baseTotal, remainingDailyBudget, decisionLog);
  }

  private buildResult(
    winner: Contender,
    baseTotal: number,
    remainingDailyBudget: number,
    decisionLog: DecisionLogEntry[],
  ): OptimizationResult {
    const finalTotal = winner.total;
    // §7.2: discount() already clamps flat coupons to the amount and
    // percentage coupons are bounded by definition -- a negative total is a
    // logic bug, not a real coupon scenario. Surface it loudly.
    if (finalTotal < 0) {
      throw new Error(`HackerAlgorithm invariant violated: finalTotal ${finalTotal} < 0`);
    }
    return {
      finalItems: winner.items,
      appliedCouponCode: winner.couponCode,
      baseTotal,
      finalTotal,
      savingsAchieved: baseTotal - finalTotal,
      overBudget: finalTotal > remainingDailyBudget,
      decisionLog,
    };
  }

  // §4.1 -- shared by every candidate evaluation.
  private discount(amount: number, coupon: Coupon): number {
    if (coupon.discountType === "flat") {
      return Math.min(coupon.discountValue, amount);
    }
    const raw = Math.floor((amount * coupon.discountValue) / 100);
    return Math.min(raw, coupon.maxDiscount ?? raw);
  }

  // §4.2 -- run once per coupon, before any filler search.
  private checkEligibility(
    coupon: Coupon,
    baseTotal: number,
    now: Date,
    affordableFillerBudget: number,
  ): { eligible: true } | { eligible: false; reason: string } {
    if (coupon.isApplicable === false) {
      return { eligible: false, reason: "not applicable" };
    }
    if (coupon.expiresAt && new Date(coupon.expiresAt) <= now) {
      return { eligible: false, reason: "expired" };
    }
    if (!coupon.paymentModes.includes("online")) {
      return { eligible: false, reason: "payment mode mismatch" };
    }
    if (coupon.minOrderValue > baseTotal + affordableFillerBudget) {
      return { eligible: false, reason: "not globally optimal" };
    }
    return { eligible: true };
  }

  // §4.3 -- per-coupon best-outcome search.
  private optimizeSingleCoupon(
    coupon: Coupon,
    baselineItems: { itemId: string; quantity: number }[],
    baseTotal: number,
    sortedFillerCandidates: FillerCandidate[],
    remainingDailyBudget: number,
  ): { contender: Contender | null; logEntry: DecisionLogEntry } {
    let items = baselineItems;
    let fillersAdded: string[] = [];
    let amountForDiscount = baseTotal;

    if (baseTotal < coupon.minOrderValue) {
      const gap = coupon.minOrderValue - baseTotal;
      const combo = this.bestFillerCombo(gap, sortedFillerCandidates);
      if (!combo) {
        return {
          contender: null,
          logEntry: {
            couponCode: coupon.code,
            outcome: "rejected",
            reason: "no affordable filler combination reaches the threshold",
            computedTotal: null,
          },
        };
      }
      fillersAdded = combo.itemIds;
      amountForDiscount = baseTotal + combo.totalPrice;
      items = [
        ...baselineItems,
        ...combo.itemIds.map((itemId) => ({ itemId, quantity: 1 })),
      ];
    }

    const total = amountForDiscount - this.discount(amountForDiscount, coupon);

    if (total >= baseTotal) {
      return {
        contender: null,
        logEntry: {
          couponCode: coupon.code,
          outcome: "rejected",
          reason: "reaches threshold but not cheaper than paying B directly",
          computedTotal: total,
        },
      };
    }

    if (total > remainingDailyBudget) {
      return {
        contender: null,
        logEntry: {
          couponCode: coupon.code,
          outcome: "rejected",
          reason: "would exceed remaining daily budget",
          computedTotal: total,
        },
      };
    }

    return {
      contender: { couponCode: coupon.code, items, total, fillersAdded },
      logEntry: {
        couponCode: coupon.code,
        outcome: "accepted",
        reason: "accepted",
        computedTotal: total,
      },
    };
  }

  // §4.4 -- bounded, not brute-force. `candidates` is already pre-filtered
  // (inStock, price > 0, price <= affordable budget, deduped, sorted asc).
  private bestFillerCombo(
    gap: number,
    candidates: FillerCandidate[],
  ): { itemIds: string[]; totalPrice: number } | null {
    // Tier 1: single filler -- cheapest one that still crosses the gap.
    let best: FillerCandidate | null = null;
    for (const candidate of candidates) {
      if (candidate.price < gap) continue;
      if (!best) {
        best = candidate;
        continue;
      }
      if (candidate.price < best.price) {
        best = candidate;
      } else if (candidate.price === best.price) {
        const candidateIsPreferred = FILLER_TIEBREAK_CATEGORIES.has(candidate.category ?? "");
        const bestIsPreferred = FILLER_TIEBREAK_CATEGORIES.has(best.category ?? "");
        if (candidateIsPreferred && !bestIsPreferred) {
          best = candidate;
        }
      }
    }
    if (best) {
      return { itemIds: [best.itemId], totalPrice: best.price };
    }

    // Tier 2: two fillers, only if Tier 1 found nothing. Two-pointer scan
    // over the price-ascending array, hard cap at 2 items.
    let bestPair: { itemIds: string[]; totalPrice: number } | null = null;
    let i = 0;
    let j = candidates.length - 1;
    while (i < j) {
      const sum = candidates[i].price + candidates[j].price;
      if (sum >= gap) {
        if (!bestPair || sum < bestPair.totalPrice) {
          bestPair = { itemIds: [candidates[i].itemId, candidates[j].itemId], totalPrice: sum };
        }
        j--;
      } else {
        i++;
      }
    }
    return bestPair;
  }

  // §4.5/§4.6 -- deterministic global selection across all coupons.
  private selectWinner(contenders: Contender[]): Contender {
    const sorted = [...contenders].sort((a, b) => {
      if (a.total !== b.total) return a.total - b.total;
      const aHasFiller = a.fillersAdded.length > 0;
      const bHasFiller = b.fillersAdded.length > 0;
      if (aHasFiller !== bHasFiller) return aHasFiller ? -1 : 1;
      if (a.items.length !== b.items.length) return a.items.length - b.items.length;
      return (a.couponCode ?? "").localeCompare(b.couponCode ?? "");
    });
    return sorted[0];
  }

  // §8 row 11/12: dedupe by itemId (keep first occurrence), drop
  // out-of-stock/non-positive-price items, filter by affordable budget,
  // sort ascending once (reused across every coupon's filler search).
  private prepareFillerCandidates(
    candidates: FillerCandidate[],
    affordableFillerBudget: number,
  ): FillerCandidate[] {
    const seen = new Set<string>();
    const deduped: FillerCandidate[] = [];
    for (const candidate of candidates) {
      if (seen.has(candidate.itemId)) continue;
      seen.add(candidate.itemId);
      if (!candidate.inStock) continue;
      if (candidate.price <= 0) continue;
      if (candidate.price > affordableFillerBudget) continue;
      deduped.push(candidate);
    }
    return deduped.sort((a, b) => a.price - b.price);
  }
}
