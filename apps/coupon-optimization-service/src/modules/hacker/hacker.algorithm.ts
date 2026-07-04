/**
 * Pure function implementation of the "Hacker" logic from the product spec:
 *
 *   Total = min(B, (B + ΣFillers) - D)
 *
 * Given base cost B and coupon threshold T:
 *   1. If B < T, gap = T - B
 *   2. Search menu for a filler item whose cost ≈ gap
 *   3. If (B + filler cost) - D < B, add the filler to the cart
 *   4. Result: a free side/drink AND a lower total than the original meal
 *
 * Deliberately has zero I/O -- keeps the core money-math unit-testable
 * without mocking HTTP calls.
 */
export class HackerAlgorithm {
  computeOptimalCart(baseCost: number, threshold: number, discount: number, fillerCandidates: { itemId: string; price: number }[]) {
    throw new Error("not implemented in scaffold");
  }
}
