import { Coupon, CartItem, FillerCandidate } from "@gusto/contracts";
import { HackerAlgorithm } from "./hacker.algorithm";

const NOW = new Date("2026-01-01T12:00:00.000Z");

function cartItem(itemId: string, price: number, quantity = 1): CartItem {
  return { itemId, price, quantity };
}

function coupon(overrides: Partial<Coupon> & { code: string }): Coupon {
  return {
    discountType: "flat",
    discountValue: 0,
    maxDiscount: null,
    minOrderValue: 0,
    paymentModes: ["online"],
    isApplicable: null,
    expiresAt: null,
    ...overrides,
  };
}

function filler(itemId: string, price: number, opts: Partial<FillerCandidate> = {}): FillerCandidate {
  return { itemId, price, inStock: true, ...opts };
}

describe("HackerAlgorithm", () => {
  let algorithm: HackerAlgorithm;

  beforeEach(() => {
    algorithm = new HackerAlgorithm();
  });

  // Design doc §10 Example A -- already eligible, no filler needed.
  it("applies a flat coupon directly when the cart already meets minOrderValue", () => {
    const result = algorithm.optimize({
      cartItems: [cartItem("item_1", 45000)],
      coupons: [coupon({ code: "FLAT50", minOrderValue: 40000, discountValue: 5000 })],
      fillerCandidates: [],
      remainingDailyBudget: 100000,
      now: NOW,
    });

    expect(result.appliedCouponCode).toBe("FLAT50");
    expect(result.baseTotal).toBe(45000);
    expect(result.finalTotal).toBe(40000);
    expect(result.savingsAchieved).toBe(5000);
    expect(result.overBudget).toBe(false);
  });

  // Design doc §10 Example B -- single filler closes the gap profitably.
  it("adds a single filler item when it profitably crosses the coupon threshold", () => {
    const result = algorithm.optimize({
      cartItems: [cartItem("item_1", 27000)],
      coupons: [coupon({ code: "GAP30", minOrderValue: 30000, discountValue: 6000 })],
      fillerCandidates: [filler("garlic_bread", 3500)],
      remainingDailyBudget: 100000,
      now: NOW,
    });

    expect(result.appliedCouponCode).toBe("GAP30");
    expect(result.finalTotal).toBe(24500);
    expect(result.finalItems.some((i) => i.itemId === "garlic_bread")).toBe(true);
  });

  // Design doc §10 Example C -- (a) still profitable despite pricier filler.
  it("accepts a pricier filler if the resulting total is still cheaper than baseline", () => {
    const result = algorithm.optimize({
      cartItems: [cartItem("item_1", 27000)],
      coupons: [coupon({ code: "GAP30", minOrderValue: 30000, discountValue: 6000 })],
      fillerCandidates: [filler("pricier_side", 4500)],
      remainingDailyBudget: 100000,
      now: NOW,
    });

    expect(result.appliedCouponCode).toBe("GAP30");
    expect(result.finalTotal).toBe(25500);
  });

  // Design doc §10 Example C -- (b) rejected: reaches threshold but not cheaper than baseline.
  it("rejects a coupon+filler combo that reaches threshold but isn't cheaper than the baseline", () => {
    const result = algorithm.optimize({
      cartItems: [cartItem("item_1", 27000)],
      coupons: [coupon({ code: "GAP30", minOrderValue: 30000, discountValue: 2000 })],
      fillerCandidates: [filler("pricier_side", 4500)],
      remainingDailyBudget: 100000,
      now: NOW,
    });

    expect(result.appliedCouponCode).toBeNull();
    expect(result.finalTotal).toBe(27000);
    expect(result.decisionLog).toContainEqual(
      expect.objectContaining({
        couponCode: "GAP30",
        outcome: "rejected",
        reason: "reaches threshold but not cheaper than paying B directly",
      }),
    );
  });

  // Design doc §10 Example D -- percentage coupon capped by maxDiscount.
  it("caps a percentage discount at maxDiscount instead of the raw computed value", () => {
    const result = algorithm.optimize({
      cartItems: [cartItem("item_1", 60000)],
      coupons: [
        coupon({ code: "PERC20", discountType: "percentage", discountValue: 20, maxDiscount: 8000, minOrderValue: 50000 }),
      ],
      fillerCandidates: [],
      remainingDailyBudget: 100000,
      now: NOW,
    });

    expect(result.finalTotal).toBe(52000); // not 48000 (uncapped 12000 discount)
  });

  // Design doc §10 Example E -- over budget: rejected candidate, baseline wins, overBudget flagged, never throws.
  it("flags overBudget and returns the cheapest available contender without throwing", () => {
    const result = algorithm.optimize({
      cartItems: [cartItem("item_1", 32000)],
      coupons: [coupon({ code: "SMALL10", minOrderValue: 30000, discountValue: 1000 })],
      fillerCandidates: [],
      remainingDailyBudget: 30000,
      now: NOW,
    });

    expect(result.decisionLog).toContainEqual(
      expect.objectContaining({ couponCode: "SMALL10", outcome: "rejected", reason: "would exceed remaining daily budget" }),
    );
    expect(result.appliedCouponCode).toBeNull();
    expect(result.finalTotal).toBe(32000);
    expect(result.overBudget).toBe(true);
  });

  // Design doc §10 Example F -- an excluded (payment-offer) coupon never
  // reaches the algorithm at all, so it never appears in decisionLog. That
  // exclusion happens in the mapping layer (see coupon-response.mapper.spec.ts);
  // here we confirm decisionLog only ever reflects coupons actually passed in.
  it("never produces a decisionLog entry for a coupon that was excluded before reaching the algorithm", () => {
    const result = algorithm.optimize({
      cartItems: [cartItem("item_1", 45000)],
      coupons: [coupon({ code: "WELCOME20", minOrderValue: 40000, discountValue: 5000 })],
      fillerCandidates: [],
      remainingDailyBudget: 100000,
      now: NOW,
    });

    expect(result.decisionLog).toHaveLength(1);
    expect(result.decisionLog.some((entry) => entry.couponCode === "HDFC10")).toBe(false);
  });

  // §8 row 1 -- empty cart.
  it("returns the baseline immediately for an empty cart, skipping coupon search", () => {
    const result = algorithm.optimize({
      cartItems: [],
      coupons: [coupon({ code: "ANY", minOrderValue: 0, discountValue: 100 })],
      fillerCandidates: [],
      remainingDailyBudget: 10000,
      now: NOW,
    });

    expect(result.baseTotal).toBe(0);
    expect(result.finalTotal).toBe(0);
    expect(result.appliedCouponCode).toBeNull();
    expect(result.decisionLog).toHaveLength(0);
  });

  // §8 row 3 -- empty coupons array.
  it("returns the baseline when no coupons are provided at all", () => {
    const result = algorithm.optimize({
      cartItems: [cartItem("item_1", 10000)],
      coupons: [],
      fillerCandidates: [],
      remainingDailyBudget: 20000,
      now: NOW,
    });

    expect(result.appliedCouponCode).toBeNull();
    expect(result.finalTotal).toBe(10000);
  });

  // §8 row 6 -- uncapped percentage discount.
  it("applies an uncapped percentage discount when maxDiscount is null", () => {
    const result = algorithm.optimize({
      cartItems: [cartItem("item_1", 60000)],
      coupons: [coupon({ code: "PERC20", discountType: "percentage", discountValue: 20, maxDiscount: null, minOrderValue: 50000 })],
      fillerCandidates: [],
      remainingDailyBudget: 100000,
      now: NOW,
    });

    expect(result.finalTotal).toBe(48000); // 60000 - floor(60000*20/100)=12000
  });

  // §8 row 7 -- flat discount larger than cart total floors at 0, never negative.
  it("clamps a flat discount larger than the cart total to the cart total itself", () => {
    const result = algorithm.optimize({
      cartItems: [cartItem("item_1", 1000)],
      coupons: [coupon({ code: "HUGEFLAT", minOrderValue: 0, discountValue: 5000 })],
      fillerCandidates: [],
      remainingDailyBudget: 10000,
      now: NOW,
    });

    expect(result.finalTotal).toBe(0);
    expect(result.finalTotal).toBeGreaterThanOrEqual(0);
  });

  // §8 row 9 -- filler priced just below the gap is rejected, not treated as a near-miss.
  it("rejects a filler priced below the gap even though it's close", () => {
    const result = algorithm.optimize({
      cartItems: [cartItem("item_1", 27000)],
      coupons: [coupon({ code: "GAP30", minOrderValue: 30000, discountValue: 6000 })],
      fillerCandidates: [filler("just_under", 2900)], // gap is 3000
      remainingDailyBudget: 100000,
      now: NOW,
    });

    expect(result.appliedCouponCode).toBeNull();
    expect(result.decisionLog).toContainEqual(
      expect.objectContaining({ couponCode: "GAP30", outcome: "rejected", reason: "no affordable filler combination reaches the threshold" }),
    );
  });

  // §8 row 11 -- duplicate itemId fillers dedupe, keeping the first occurrence.
  it("dedupes duplicate filler itemIds, keeping the first occurrence", () => {
    const result = algorithm.optimize({
      cartItems: [cartItem("item_1", 27000)],
      coupons: [coupon({ code: "GAP30", minOrderValue: 30000, discountValue: 6000 })],
      fillerCandidates: [filler("dup", 3500), filler("dup", 3500)],
      remainingDailyBudget: 100000,
      now: NOW,
    });

    const fillerCount = result.finalItems.filter((i) => i.itemId === "dup").length;
    expect(fillerCount).toBe(1);
  });

  // §8 row 12 -- out-of-stock candidates excluded entirely.
  it("excludes out-of-stock filler candidates from consideration", () => {
    const result = algorithm.optimize({
      cartItems: [cartItem("item_1", 27000)],
      coupons: [coupon({ code: "GAP30", minOrderValue: 30000, discountValue: 6000 })],
      fillerCandidates: [filler("oos", 3500, { inStock: false })],
      remainingDailyBudget: 100000,
      now: NOW,
    });

    expect(result.appliedCouponCode).toBeNull();
    expect(result.finalItems.some((i) => i.itemId === "oos")).toBe(false);
  });

  // §8 row 14 -- deterministic tie-break: filler-inclusive wins on an exact total tie.
  it("prefers a filler-inclusive contender over a plain one on an exact total tie", () => {
    // Coupon A: no filler needed, total lands at 24500.
    // Coupon B: needs a filler, also lands at 24500 -- exact tie.
    const result = algorithm.optimize({
      cartItems: [cartItem("item_1", 27000)],
      coupons: [
        coupon({ code: "A_NOFILLER", minOrderValue: 0, discountValue: 2500 }), // 27000-2500=24500
        coupon({ code: "B_FILLER", minOrderValue: 30000, discountValue: 6000 }), // (27000+3500)-6000=24500
      ],
      fillerCandidates: [filler("side", 3500)],
      remainingDailyBudget: 100000,
      now: NOW,
    });

    expect(result.finalTotal).toBe(24500);
    expect(result.appliedCouponCode).toBe("B_FILLER");
  });

  // §8 row 19 -- 3+ fillers needed is out of scope; coupon is rejected, never force-fit.
  it("rejects a coupon whose gap can't be closed within the 2-filler cap", () => {
    const result = algorithm.optimize({
      cartItems: [cartItem("item_1", 10000)],
      coupons: [coupon({ code: "BIGGAP", minOrderValue: 40000, discountValue: 1000 })], // gap 30000
      fillerCandidates: [filler("f1", 5000), filler("f2", 5000), filler("f3", 5000)], // best pair only reaches 10000
      remainingDailyBudget: 100000,
      now: NOW,
    });

    expect(result.appliedCouponCode).toBeNull();
    expect(result.decisionLog).toContainEqual(
      expect.objectContaining({ couponCode: "BIGGAP", outcome: "rejected", reason: "no affordable filler combination reaches the threshold" }),
    );
  });

  it("throws for a genuine invariant violation instead of silently clamping", () => {
    // Cannot occur through the public discount() path (already clamped), so
    // this documents the invariant check exists rather than exercising an
    // unreachable branch through normal inputs.
    const algo = new HackerAlgorithm() as unknown as {
      buildResult: (winner: unknown, baseTotal: number, remainingDailyBudget: number, decisionLog: unknown[]) => unknown;
    };
    expect(() =>
      algo.buildResult({ couponCode: null, items: [], total: -1, fillersAdded: [] }, 100, 1000, []),
    ).toThrow(/invariant violated/);
  });
});
