import { mapMenuResponseToFillerCandidates } from "./menu-response.mapper";

describe("mapMenuResponseToFillerCandidates", () => {
  it("maps a flat items array into FillerCandidate[]", () => {
    const raw = {
      items: [
        { id: "item_1", price: 3500, category: "side", inStock: true },
        { id: "item_2", price: 4500, inStock: true },
      ],
    };

    const candidates = mapMenuResponseToFillerCandidates(raw);
    expect(candidates).toHaveLength(2);
    expect(candidates[0].category).toBe("side");
    expect(candidates[1].category).toBeUndefined();
  });

  it("maps a categories-paginated shape into a flat FillerCandidate[]", () => {
    const raw = {
      categories: [
        { items: [{ id: "item_1", price: 3500, inStock: true }] },
        { items: [{ id: "item_2", price: 4500, inStock: true }] },
      ],
    };

    const candidates = mapMenuResponseToFillerCandidates(raw);
    expect(candidates.map((c) => c.itemId)).toEqual(["item_1", "item_2"]);
  });

  // §8 row 20 -- string-typed monetary values coerced to numbers.
  it("coerces a string-typed price into a number", () => {
    const raw = { items: [{ id: "item_1", price: "3500", inStock: true }] };
    const candidates = mapMenuResponseToFillerCandidates(raw);
    expect(candidates[0].price).toBe(3500);
  });

  // §8 row 13 -- non-positive price rejected at this boundary.
  it("drops an item with a zero or negative price", () => {
    const raw = {
      items: [
        { id: "bad", price: 0, inStock: true },
        { id: "good", price: 100, inStock: true },
      ],
    };
    const candidates = mapMenuResponseToFillerCandidates(raw);
    expect(candidates.map((c) => c.itemId)).toEqual(["good"]);
  });

  // §8 row 5 -- one malformed record dropped without aborting the batch.
  it("drops a single malformed menu item without aborting the rest", () => {
    const raw = {
      items: [
        { id: "good", price: 100, inStock: true },
        { price: 100 }, // malformed: missing id
      ],
    };
    const candidates = mapMenuResponseToFillerCandidates(raw);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].itemId).toBe("good");
  });

  it("returns an empty array when the response doesn't match the expected shape at all", () => {
    expect(mapMenuResponseToFillerCandidates(null)).toEqual([]);
    expect(mapMenuResponseToFillerCandidates("not an object")).toEqual([]);
  });
});
