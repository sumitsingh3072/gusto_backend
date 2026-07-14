# `coupon-optimization-service` — Algorithm Design

**Status:** design spec, ready to hand to an implementation agent.
**Scope:** the pure algorithm only (`HackerAlgorithm` — zero I/O, fully unit-testable). The service wrapper (`HackerService`) that calls `fetch_food_coupons`/menu lookups through MCP Gateway and hands data to this algorithm is a thin shell around it — see §9 for the exact seam.

---

## 0. Correction to the formula as stated

You wrote `Total = min(B, ΣFillers − D)`. The original product spec's formula
(and the one this design implements) is:

```
Total = min(B, (B + ΣFillers) − D)
```

The difference matters — without the `B +`, the formula describes discounting
*only the filler's cost*, not the whole cart. Flagging this now since it's the
kind of transcription slip that's easy to carry into an implementation
unnoticed. Everything below uses the correct form, generalized to support
multiple fillers (`ΣFillers`, plural, as you had it) and both flat and
percentage-based discounts (real coupons are usually the latter).

## 1. What we actually know vs. what we're assuming

Grounding this in the two real tool docs you provided, plus what has to be
inferred since neither doc shows the actual shape of a coupon object inside
`data`:

**Confirmed from docs:**
- `fetch_food_coupons(restaurantId, addressId, couponCode?)` — read-only,
  `restaurantId` and `addressId` are required. `couponCode` optional param
  exists specifically to check *one* coupon's applicability — useful later
  as a pre-flight re-check at execution time (§8.6).
- `apply_food_coupon(couponCode, addressId, cartId?)` — mutating, applies a
  single coupon to the cart at execution time.
- Response envelope for every tool: `{success, data, message?}` or
  `{success: false, error: {message}}`.
- Doc explicitly instructs: *"Only recommend coupons valid for COD... filter
  out offers requiring online/card payment only."* — see §2 for why Gusto
  does the **opposite** filter.
- Coupons are fetched **per restaurant** — a cart can only use coupons valid
  for its own restaurant, so a multi-restaurant cart is out of scope by
  construction (Swiggy carts are single-restaurant anyway).

**Assumed, needs reconciling against a real sandbox response before ship:**
- The actual field names inside each coupon object (`discountType`,
  `discountValue`, `maxDiscount`, `minOrderValue`, `paymentModes`,
  `isApplicable`, `expiresAt` — reasonable guesses, not confirmed).
- Whether Swiggy computes `isApplicable` itself (preferred — trust it over
  reimplementing eligibility logic) or leaves all eligibility checks to the
  caller.

The algorithm below is written against an explicit internal schema
(§3) so that reconciling it later is a one-file, one-mapping-function change
— not a rewrite.

## 2. Two business-logic corrections, not just edge cases

### 2.1 Cart coupons only — payment-instrument offers are excluded entirely

Re-reading `fetch_food_coupons`'s own description closely: *"Includes best
coupons, more offers, and payment offers with their applicability status..."*
That phrasing implies the response is already **bucketed by category** —
something like `bestCoupons` / `moreOffers` (generic, cart-level discounts)
versus `paymentOffers` (cashback/discounts tied to a specific bank card,
wallet, or payment instrument — e.g., "10% off with HDFC card").

Gusto pays via a single pre-authorized method through the one-tap flow —
there's no per-order choice of bank card or wallet the way a human tapping
through Swiggy's own app would have. Payment-instrument offers aren't
reliably (or ever) applicable to that flow, so **the entire `paymentOffers`
bucket is dropped before any data reaches this algorithm** — not filtered
per-item inside the pure function, but excluded wholesale at the response-
normalization boundary in `HackerService` (§9). The `Coupon` schema in §3
represents only cart-level coupons; a payment offer should never be
constructed as a `Coupon` object in the first place.

This is a **stronger, earlier cut** than the payment-mode check in §2.2
below — it's not "is this coupon compatible with online payment," it's "is
this even the kind of coupon Gusto's flow can use at all."

### 2.2 Cart coupons themselves may still have a payment-mode restriction

Separately from §2.1: even among plain cart-level coupons (the ones that
survive the bucket-level cut), an individual coupon can still carry its own
`paymentModes` restriction (e.g., "not valid on Cash on Delivery"). This is
an orthogonal, second check, still applied per-coupon inside the algorithm
(§4.2) — a cart coupon surviving the §2.1 bucket cut still needs to pass
this compatibility check on its own terms.

`fetch_food_coupons`'s docs instruct filtering for **COD-only** validity.
That instruction is written for a generic conversational shopping assistant.
It is **wrong for Gusto specifically**: the product spec's "One-Tap
biometric verify to pay" flow is a pre-authorized online payment, not cash
handed to a delivery rider. So this check filters for coupons valid under
**online/prepaid** payment, not COD — the inverse of the doc's literal
guidance. Worth a one-line comment in the code pointing back to this
doc, so nobody "fixes" it back to COD later because the tool's own
description told them to.

## 3. Internal data contracts

```ts
interface CartItem {
  itemId: string;
  price: number;   // integer paise, not rupees -- see §7.1
  quantity: number;
}

interface Coupon {
  code: string;
  discountType: "flat" | "percentage";
  discountValue: number;          // paise if flat, 0-100 if percentage
  maxDiscount: number | null;     // paise; cap for percentage coupons; null = uncapped
  minOrderValue: number;          // paise; this is T
  paymentModes: ("online" | "cod" | "wallet")[];
  isApplicable: boolean | null;   // trust this if Swiggy provides it (§1)
  expiresAt: string | null;       // ISO-8601; null = no stated expiry
}

interface FillerCandidate {
  itemId: string;
  price: number;      // integer paise
  category?: "side" | "beverage" | "dessert" | "main" | string;
  inStock: boolean;
}

interface OptimizationInput {
  cartItems: CartItem[];
  coupons: Coupon[];
  fillerCandidates: FillerCandidate[];
  remainingDailyBudget: number;   // integer paise, hard ceiling -- see §6
  now: Date;                       // injected, not Date.now(), for determinism in tests
}

interface OptimizationResult {
  finalItems: { itemId: string; quantity: number }[];
  appliedCouponCode: string | null;
  baseTotal: number;               // B, paise
  finalTotal: number;               // paise
  savingsAchieved: number;          // baseTotal - finalTotal, paise, >= 0
  overBudget: boolean;              // true if finalTotal > remainingDailyBudget
  decisionLog: DecisionLogEntry[];  // maps to orders.agent_logs
}

interface DecisionLogEntry {
  couponCode: string | "none";
  outcome: "accepted" | "rejected";
  reason: string;   // human-readable, e.g. "expired", "payment mode mismatch",
                     // "no filler closes the gap within budget", "not globally optimal"
  computedTotal: number | null;  // paise, if computable
}
```

All money is **integer paise** internally (§7.1) — never floating point
rupees during computation.

## 4. The algorithm

### 4.1 Discount function (shared by every candidate evaluation)

```
discount(amount: paise, coupon: Coupon) -> paise:
  if coupon.discountType == "flat":
    return min(coupon.discountValue, amount)   # can't discount more than the amount itself
  else: # percentage
    raw = floor(amount * coupon.discountValue / 100)
    return min(raw, coupon.maxDiscount ?? raw)
```

`floor`, not round — never let a rounding-up produce a discount larger than
what Swiggy will actually honor at execution time.

### 4.2 Coupon eligibility filter (run once per coupon, before any filler search)

By this point, `input.coupons` has **already had the entire `paymentOffers`
bucket dropped** by `HackerService` (§2.1, §9) — every `Coupon` reaching this
function is a cart-level coupon by construction. This filter handles the
*remaining*, per-coupon checks (§2.2's payment-mode compatibility among
them).

A coupon is **excluded outright** (never considered further) if any of:
1. `coupon.isApplicable === false` (trust Swiggy's own verdict if present).
2. `expiresAt` is set and `expiresAt <= now`.
3. `"online" not in coupon.paymentModes` (§2.2 — the per-coupon check, not
   the bucket-level cut from §2.1).
4. `minOrderValue > B + maxAffordableFillerBudget`, where
   `maxAffordableFillerBudget = remainingDailyBudget - B` — i.e., even in
   the best case, closing the gap would require spending more than the
   user has left today. No point searching filler combinations that can
   never be affordable.

Every exclusion produces a `DecisionLogEntry` with `outcome: "rejected"` and
the specific reason — this is what makes the eventual `agent_logs` field
actually explain "why this coupon wasn't used" instead of just "wasn't
used."

### 4.3 Per-coupon best-outcome search

For each coupon that survives §4.2:

```
if B >= coupon.minOrderValue:
    # already eligible, no filler needed
    total = B - discount(B, coupon)
    candidate = { items: cartItems, total, fillersAdded: [] }
else:
    gap = coupon.minOrderValue - B
    candidate = bestFillerCombo(gap, coupon, fillerCandidates, remainingDailyBudget - B)
    # bestFillerCombo returns null if nothing profitable found

if candidate is null:
    log "rejected", reason: "no affordable filler combination reaches the threshold"
    continue

if candidate.total >= B:
    log "rejected", reason: "reaches threshold but not cheaper than paying B directly"
    continue

if candidate.total > remainingDailyBudget:
    log "rejected", reason: "would exceed remaining daily budget"
    continue

log "accepted", computedTotal: candidate.total
record candidate as a contender
```

### 4.4 Filler search (`bestFillerCombo`) — bounded, not brute-force

Search order, cheapest-viable-tier first, stopping as soon as a tier
produces at least one valid candidate (no need to search 2-item combos if a
single item already works — simpler cart wins by default per §4.6):

**Tier 1 — single filler.**
Linear scan over `fillerCandidates` (pre-filtered: `inStock`, `price > 0`,
`price <= affordableFillerBudget`), sorted by price ascending. For each
candidate `f`:
- valid iff `f.price >= gap` (actually crosses the threshold — a filler
  priced *below* the gap does nothing and must be rejected, not treated as
  "close enough")
- among all valid candidates, the best is the **cheapest one that still
  crosses the gap** (minimizes total spend while satisfying the threshold)
  — not the closest-by-absolute-difference, since overshooting the gap by a
  little more for a much cheaper item is still better for the user.
- Prefer `category` in `{side, beverage, dessert}` over `main` when two
  candidates tie on price — matches the product intent ("free side/drink"),
  not "here's a second unwanted entree." This is a soft preference, applied
  only as a tiebreaker, never overriding the profitability math.

**Tier 2 — two fillers** (only attempted if Tier 1 found nothing). Sort
candidates by price ascending; two-pointer scan (`i` from cheapest, `j` from
most-expensive-affordable) looking for `candidates[i].price +
candidates[j].price >= gap`, minimizing the pair's combined price — O(n log n)
via sort + two pointers, not O(n²). Cap combined filler count at **2 items,
hard limit** — a 3-item filler search has real diminishing returns (the
"delightful free side" framing breaks down once the cart is visibly padded)
and isn't worth the added complexity/latency. If you need 3+ fillers to
reach a threshold, that's a signal the coupon isn't a good fit for this cart
— reject it, don't force it.

If neither tier produces a valid combination, return `null`.

### 4.5 Global selection across all coupons

```
contenders = [ {couponCode: null, total: B, items: cartItems} ]  # baseline always included
             + every accepted candidate from §4.3, across all coupons

winner = argmin(contenders, by: total,
                tie-break 1: prefer candidates with fillersAdded.length > 0 (§4.6),
                tie-break 2: prefer fewer total distinct items (simpler cart),
                tie-break 3: sort by couponCode string ascending)  # pure determinism
```

The baseline (`no coupon, total = B`) is **always** a contender — this is
what makes `min(B, ...)` in the formula meaningful. If every coupon is
rejected or every candidate is worse than `B`, the winner is just the
original cart at full price. That is a correct, expected, non-error
outcome, not a failure state.

### 4.6 Why prefer filler-inclusive outcomes on a tie

Product intent (§0/brief) explicitly frames the "free side/drink" outcome as
the delightful result, not merely "any total that happens to be lowest." When
two contenders produce byte-identical totals, choosing the one with an extra
item is strictly better for the user (more food, same price) — so it wins
the tie. This only ever applies when totals are exactly equal; it never
overrides the core profitability comparison.

## 5. Complexity

- Coupon eligibility filtering: `O(C)` where `C` = number of coupons
  (typically single digits).
- Per-coupon filler search: `O(F log F)` for the sort (once, reused across
  coupons — sort `fillerCandidates` a single time up front, not per coupon),
  `O(F)` for Tier 1, `O(F)` for Tier 2's two-pointer scan.
- Total: `O(F log F + C·F)`. For realistic menu sizes (F in the low hundreds
  at most) and coupon counts (C in the single digits), this comfortably
  fits inside the T-30-minutes execution window with room to spare — no
  need for anything fancier.

## 6. The budget ceiling is a hard constraint, not a preference

`remainingDailyBudget` is supplied by the orchestrator (sourced from
escrow-service). Two distinct things can happen:
- A contender that would otherwise win is **excluded** if its total exceeds
  the budget (§4.3's third check) — the algorithm will pick the
  next-best *affordable* option instead.
- If **every** contender, including the unmodified baseline `B`, exceeds
  the budget, that's not this algorithm's problem to solve (the base cart
  should never have been shortlisted over budget in the first place — a
  Scout-phase concern). In that case: still return the cheapest available
  contender, but set `overBudget: true` on the result so the orchestrator
  can decide to skip/flag the meal rather than silently placing an
  unaffordable order. Never throw here — a thrown exception mid-optimization
  is worse than an honestly-flagged over-budget result, since it would break
  the T-30 execution window for no benefit.

## 7. Correctness details that are easy to get wrong

### 7.1 Integer paise, never floating-point rupees

`0.1 + 0.2 !== 0.3` in every mainstream language's floating point. All
monetary fields in §3 are integers (smallest currency unit). Convert to
rupees only at the display/logging boundary, never mid-computation. This one
line prevents an entire category of "the coupon math is off by one paisa and
nobody knows why" bugs.

### 7.2 Discount can never make the total negative

`discount()` in §4.1 already clamps to `min(discountValue, amount)` for
flat coupons — a flat discount larger than the cart itself cannot produce a
negative total. Percentage discounts are bounded by definition (≤100% of
`amount`, further capped by `maxDiscount`). No additional clamping should be
needed if §4.1 is implemented exactly as specified — but assert
`finalTotal >= 0` defensively anyway and treat a violation as a logic bug
worth surfacing loudly (throw, don't silently clamp), not a real coupon
scenario.

### 7.3 A filler must close the gap, not just be *close* to it

Restated because it's the single easiest mistake to make translating the
brief's prose into code: "search menu for `Item_f` where
`Cost(Item_f) ≈ Gap`" reads like nearest-price matching, but the actual
requirement (brief step 3) is `B + Cost(filler) >= T`. A filler priced
just under the gap (technically "close") does not unlock the coupon at all
and must be rejected outright, not scored as a near-miss.

### 7.4 Race condition between simulation (this service) and execution (order-execution-service)

This service *simulates* against a `fetch_food_coupons` snapshot. By the
time `order-execution-service` actually calls `apply_food_coupon` at T-30
minutes, that coupon could have expired, hit a usage cap, or otherwise
become invalid — `fetch_food_coupons`'s optional `couponCode` parameter
exists for exactly this: order-execution-service should do a one-shot
re-check of the specific winning coupon immediately before calling
`apply_food_coupon`, and gracefully fall back to the no-coupon baseline
cart if it's gone stale, rather than failing the order outright. That
fallback belongs in `order-execution-service`, not here — but the
`decisionLog`'s `appliedCouponCode` needs to be threaded through so that
fallback path knows exactly which coupon to re-verify.

### 7.5 Restaurant/cart invariant

`fetch_food_coupons` requires a single `restaurantId`. Assert (defensively,
at the service boundary, not inside the pure algorithm) that every item in
`cartItems` belongs to the same restaurant before calling this algorithm at
all — if that invariant is ever violated upstream, that's a Scout-phase bug
worth failing loudly on, not something to silently paper over here.

## 8. Full edge-case catalogue

| # | Scenario | Handling |
|---|---|---|
| 1 | Empty cart (`B = 0`) | Return baseline immediately, no coupon search. |
| 2 | `fetch_food_coupons` returns `success: false` | Caller (§9) catches this, passes `coupons: []` into the algorithm — never throws from inside the pure function for an upstream API failure. |
| 3 | `coupons` is an empty array | Only contender is baseline; algorithm returns `B` with `appliedCouponCode: null`. Correct, not an error. |
| 4 | Coupon missing `minOrderValue`/`isApplicable`/`expiresAt` | Treat missing `minOrderValue` as `0` (always past threshold); treat missing `isApplicable` as "unknown, don't exclude on this basis alone"; treat missing `expiresAt` as "no expiry." Never let a missing optional field silently exclude an otherwise-good coupon. |
| 5 | Malformed coupon object (wrong types, fails schema parse) | Drop that single coupon, log a `rejected` entry with reason `"malformed coupon data"`, continue evaluating the rest. One bad record must never abort the whole batch. |
| 6 | Percentage coupon with no `maxDiscount` | Uncapped — `discount()` in §4.1 handles this via `?? raw` (cap defaults to the raw computed value, i.e., no cap applied). |
| 7 | Flat discount larger than cart total | Clamped to `amount` (§7.2) — total floors at 0, never negative. |
| 8 | No filler item exists anywhere near the gap | `bestFillerCombo` returns `null`, coupon rejected with reason logged, algorithm moves on. |
| 9 | Filler item priced below the gap | Rejected as invalid in Tier 1 (§4.4) — "close" isn't sufficient, must cross T (§7.3). |
| 10 | Cheapest available filler still blows the daily budget | Excluded by §4.2 rule 4 before any search even runs. |
| 11 | Filler candidate list contains duplicate `itemId`s | Dedupe by `itemId` before sorting, keep first occurrence. |
| 12 | Filler candidate `inStock: false` | Excluded from the candidate pool entirely, never considered. |
| 13 | Negative or zero price on a menu item (data error) | Reject that item from the candidate pool at the schema-validation boundary (§9), never let it enter the algorithm. |
| 14 | Two coupons produce identical totals | Tie-break per §4.5/§4.6: filler-inclusive wins, then fewer items, then coupon code sort — fully deterministic. |
| 15 | `couponCode`-specific re-check (execution-time) comes back invalid | Not this algorithm's concern — see §7.4, handled by order-execution-service's fallback. |
| 16 | Every coupon rejected, cart is over the daily budget even unmodified | Return baseline with `overBudget: true` (§6) — never throw. |
| 17 | `now` not supplied / system clock skew | `now` is a required injected parameter (§3), never read from `Date.now()` inside the pure function — makes expiry-boundary tests deterministic and removes clock skew as a variable entirely. |
| 18 | Cart spans more than one restaurant | Invariant violation, asserted at the service boundary before this algorithm is ever called (§7.5) — not handled inside the pure function. |
| 19 | 3+ fillers needed to reach any coupon's threshold | Out of scope by design (§4.4 hard caps at 2) — coupon is treated as unreachable and rejected, not force-fit. |
| 20 | All monetary values arrive as strings from the API (common JSON-over-HTTP issue) | Normalized/coerced at the schema-validation boundary (§9) with `zod`'s coercion, never inside the algorithm itself, which only ever sees `number` (integer paise). |
| 21 | Response includes a `paymentOffers` bucket (or equivalent) alongside cart-level coupons | Dropped entirely during normalization (§2.1, §9) — never constructed as a `Coupon`, never reaches the algorithm. Not an algorithm-level check. |
| 22 | Real response shape turns out to be a flat list with a type discriminator instead of separate buckets | Normalization layer (§9) applies the same cart-vs-payment distinction either way — whichever shape it turns out to be, the exclusion happens before `Coupon[]` is constructed, so the algorithm's behavior doesn't change. |

## 9. The I/O seam — what stays outside this pure function

Everything above is `HackerAlgorithm.optimize(input: OptimizationInput):
OptimizationResult` — zero network calls, zero `Date.now()`, zero
randomness. `HackerService` (the thin wrapper) is responsible for:
1. Calling `mcp-gateway-service` for `fetch_food_coupons` and the
   restaurant's menu (for filler candidates), with its own timeout/retry
   and try/catch — on any failure of either call, degrade to calling the
   algorithm with `coupons: []` / `fillerCandidates: []` rather than
   failing the whole optimization pass.
2. Validating/coercing raw API responses into §3's schema via `zod` (this is
   where scenario #13/#20 in §8 actually get handled, not inside the
   algorithm) — **and, critically, dropping the entire `paymentOffers`
   bucket at this exact step (§2.1)**. Only items from the cart-level
   buckets (`bestCoupons`/`moreOffers`, or whatever the real response keys
   turn out to be — see §11) are ever mapped into `Coupon` objects. If the
   real response shape turns out to be a flat array with a type
   discriminator instead of separate buckets, this is still the one place
   that distinction gets applied — the algorithm itself never sees a
   payment-instrument offer, in either response shape.
3. Injecting `now: new Date()` and `remainingDailyBudget` (fetched from
   escrow-service) at call time.
4. Nothing else — no business logic belongs in the service wrapper; if
   you're tempted to add an `if` statement there, it almost certainly
   belongs in the algorithm instead, where it can be unit tested without
   mocking HTTP. The one exception is the bucket-dropping in step 2 above —
   that's response-shape normalization, not business logic, which is why it
   belongs here rather than in the pure function.

## 10. Worked examples (use these as the first unit tests)

All amounts in paise for the math, rupees in parens for readability.

**Example A — already eligible, no filler needed.**
`B = 45000` (₹450), coupon `minOrderValue = 40000` (₹400),
`discountType = flat`, `discountValue = 5000` (₹50).
→ `B >= T`, `total = 45000 - 5000 = 40000` (₹400). Contender: 40000 < B →
accepted. No other coupons → winner is this one. `savingsAchieved = 5000`.

**Example B — single filler closes the gap profitably (the brief's example).**
`B = 27000` (₹270), coupon `minOrderValue = 30000` (₹300),
`discountType = flat`, `discountValue = 6000` (₹60). Gap = 3000 (₹30).
Cheapest filler crossing the gap: a ₹35 garlic bread (3500 paise).
`candidateTotal = (27000 + 3500) - 6000 = 24500` (₹245). `24500 < 27000` →
accepted, and strictly better than baseline. Winner. User pays ₹245 total
and gets a free-ish garlic bread versus the original ₹270 plain order.

**Example C — gap exists but no profitable filler.**
Same as B, but the only available filler near the gap costs ₹45 (4500
paise): `candidateTotal = (27000 + 4500) - 6000 = 25500`, still < B, so
actually still accepted here — good, shows the check is about the *final*
total versus B, not about matching the gap precisely. Now suppose the
discount were only 2000 paise (₹20) instead: `candidateTotal = (27000 +
4500) - 2000 = 29500 > B` → rejected (§4.3's `candidate.total >= B` check),
falls back to baseline.

**Example D — percentage coupon with a cap.**
`B = 60000` (₹600), coupon `discountType = percentage`, `discountValue =
20`, `maxDiscount = 8000` (₹80), `minOrderValue = 50000`.
Raw discount = `60000 * 20 / 100 = 12000`, capped at `8000`.
`total = 60000 - 8000 = 52000` (₹520). Accepted if better than any other
contender.

**Example E — over daily budget.**
Best coupon+filler combo computes to ₹310, but `remainingDailyBudget =
30000` (₹300). Excluded per §4.3's third check. If the baseline `B = ₹320`
is *also* over budget, final result: baseline contender wins by default (no
cheaper affordable option exists), `overBudget: true`, decision log shows
every coupon's rejection reason plus the budget flag — orchestrator decides
what to do with an over-budget, non-throwing result.

**Example F — payment offer present but excluded before it ever reaches the algorithm.**
`fetch_food_coupons` response includes `bestCoupons: [WELCOME20]` and
`paymentOffers: [{code: "HDFC10", discountValue: 10, ...}]`. During
normalization (§9), only `WELCOME20` is mapped into a `Coupon` and passed
into `OptimizationInput.coupons` — `HDFC10` is dropped entirely and never
appears in `decisionLog` at all, because it was never a candidate in the
first place. This is deliberately different from scenario #21 in §8 being
merely "rejected with a reason" — a rejected-but-considered coupon shows up
in the log with a reason; an excluded-bucket coupon shows up nowhere,
because from the algorithm's point of view it never existed. If you need
visibility into *why* a payment offer wasn't used (e.g. for debugging),
that logging belongs in `HackerService`'s normalization step, not in
`decisionLog`.

## 11. What to reconcile once real sandbox access exists

Before this ships against live traffic (mock-server testing can proceed
immediately with the schema in §3):
- Confirm real field names for the coupon object against an actual
  `fetch_food_coupons` response and update §3's mapping function
  accordingly (the algorithm itself doesn't change, only the
  zod-validation/mapping layer in `HackerService`).
- **Confirm the actual response bucket structure** — whether it's really
  separate keys like `bestCoupons`/`moreOffers`/`paymentOffers` as the
  tool's own description implies, or a flat array with a type field, or
  something else entirely. Either way, §2.1's exclusion of payment-
  instrument offers needs to map onto whatever the real shape is before
  this goes live — the design here is intentionally shape-agnostic at the
  algorithm level so this is a one-function change in `HackerService`, not
  a redesign.
- Confirm whether `paymentModes` (or whatever it's actually called) uses
  the string values assumed here, or something else — this directly gates
  the §2 filter.
- Confirm whether Swiggy provides a computed `isApplicable`/eligibility
  flag at all, or whether that has to be fully derived client-side from
  `minOrderValue` alone.
