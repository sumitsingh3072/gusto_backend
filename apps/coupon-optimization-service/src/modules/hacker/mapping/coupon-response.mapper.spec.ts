import { mapFetchFoodCouponsResponse } from "./coupon-response.mapper";

describe("mapFetchFoodCouponsResponse", () => {
  it("maps a flat array of raw coupons into Coupon[]", () => {
    const raw = [
      {
        code: "WELCOME20",
        discountType: "flat",
        discountValue: 5000,
        maxDiscount: null,
        minCartValue: 40000,
        requiresOnlinePayment: true,
        isApplicable: true,
        expiresAt: null,
      },
      {
        code: "MORE10",
        discountType: "percentage",
        discountValue: 10,
        maxDiscount: 2000,
        minCartValue: 20000,
        requiresOnlinePayment: false,
        isApplicable: null,
        expiresAt: null,
      },
    ];

    const coupons = mapFetchFoodCouponsResponse(raw);
    expect(coupons).toHaveLength(2);
    expect(coupons.map((c) => c.code).sort()).toEqual(["MORE10", "WELCOME20"]);
  });

  it("maps requiresOnlinePayment into the paymentModes contract field", () => {
    const raw = [
      {
        code: "ONLINE_ONLY",
        discountType: "flat",
        discountValue: 100,
        maxDiscount: null,
        minCartValue: 0,
        requiresOnlinePayment: true,
        isApplicable: null,
        expiresAt: null,
      },
      {
        code: "COD_OK",
        discountType: "flat",
        discountValue: 100,
        maxDiscount: null,
        minCartValue: 0,
        requiresOnlinePayment: false,
        isApplicable: null,
        expiresAt: null,
      },
    ];

    const coupons = mapFetchFoodCouponsResponse(raw);
    expect(coupons.find((c) => c.code === "ONLINE_ONLY")?.paymentModes).toEqual(["online"]);
    expect(coupons.find((c) => c.code === "COD_OK")?.paymentModes).toEqual(["cod"]);
  });

  // §8 row 5 -- one malformed record dropped without aborting the batch.
  it("drops a single malformed coupon record without aborting the rest", () => {
    const raw = [
      {
        code: "GOOD",
        discountType: "flat",
        discountValue: 100,
        maxDiscount: null,
        minCartValue: 0,
        requiresOnlinePayment: false,
        isApplicable: null,
        expiresAt: null,
      },
      { code: 12345 }, // malformed: code should be string
    ];

    const coupons = mapFetchFoodCouponsResponse(raw);
    expect(coupons).toHaveLength(1);
    expect(coupons[0].code).toBe("GOOD");
  });

  it("returns an empty array when the response doesn't match the expected flat-array envelope at all", () => {
    expect(mapFetchFoodCouponsResponse(null)).toEqual([]);
    expect(mapFetchFoodCouponsResponse("not an array")).toEqual([]);
    expect(mapFetchFoodCouponsResponse({ bestCoupons: [] })).toEqual([]);
  });
});
