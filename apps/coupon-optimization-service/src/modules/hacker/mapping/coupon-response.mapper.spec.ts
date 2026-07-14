import { mapFetchFoodCouponsResponse } from "./coupon-response.mapper";

describe("mapFetchFoodCouponsResponse", () => {
  it("maps bestCoupons and moreOffers into Coupon[]", () => {
    const raw = {
      bestCoupons: [
        {
          code: "WELCOME20",
          discountType: "flat",
          discountValue: 5000,
          maxDiscount: null,
          minOrderValue: 40000,
          paymentModes: ["online"],
          isApplicable: true,
          expiresAt: null,
        },
      ],
      moreOffers: [
        {
          code: "MORE10",
          discountType: "percentage",
          discountValue: 10,
          maxDiscount: 2000,
          minOrderValue: 20000,
          paymentModes: ["online", "cod"],
          isApplicable: null,
          expiresAt: null,
        },
      ],
    };

    const coupons = mapFetchFoodCouponsResponse(raw);
    expect(coupons).toHaveLength(2);
    expect(coupons.map((c) => c.code).sort()).toEqual(["MORE10", "WELCOME20"]);
  });

  // §8 row 21 / §2.1 -- paymentOffers bucket never produces a Coupon.
  it("never maps the paymentOffers bucket into Coupon objects", () => {
    const raw = {
      bestCoupons: [
        {
          code: "WELCOME20",
          discountType: "flat",
          discountValue: 5000,
          maxDiscount: null,
          minOrderValue: 40000,
          paymentModes: ["online"],
          isApplicable: true,
          expiresAt: null,
        },
      ],
      paymentOffers: [{ code: "HDFC10", discountValue: 10 }],
    };

    const coupons = mapFetchFoodCouponsResponse(raw);
    expect(coupons.some((c) => c.code === "HDFC10")).toBe(false);
    expect(coupons).toHaveLength(1);
  });

  // §8 row 5 -- one malformed record dropped without aborting the batch.
  it("drops a single malformed coupon record without aborting the rest", () => {
    const raw = {
      bestCoupons: [
        { code: "GOOD", discountType: "flat", discountValue: 100, maxDiscount: null, minOrderValue: 0, paymentModes: ["online"], isApplicable: null, expiresAt: null },
        { code: 12345 }, // malformed: code should be string
      ],
    };

    const coupons = mapFetchFoodCouponsResponse(raw);
    expect(coupons).toHaveLength(1);
    expect(coupons[0].code).toBe("GOOD");
  });

  it("returns an empty array when the response doesn't match the expected envelope at all", () => {
    expect(mapFetchFoodCouponsResponse(null)).toEqual([]);
    expect(mapFetchFoodCouponsResponse("not an object")).toEqual([]);
  });
});
