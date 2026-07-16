# Gusto Backend — API Endpoints

Every HTTP endpoint currently exposed by each service, verified directly
against each service's controllers. `payment-service` has no scaffold yet
(deliberately deferred — see `CLAUDE.md`) and is not listed. Every other
service is fully implemented.

---

## api-gateway (port 3000)

Public entry point. Forwards to `auth-service`; nothing else is wired yet.

| Method | Path | Auth required | Forwards to |
|---|---|---|---|
| `GET` | `/health` | No | — (answers locally) |
| `POST` | `/auth/login/start` | No | `auth-service POST /auth/login/start` |
| `POST` | `/auth/login/callback` | No | `auth-service POST /auth/login/callback` |
| `POST` | `/auth/token/refresh` | **Yes** | `auth-service POST /auth/token/refresh` (`userId` overridden from the verified JWT's `sub` claim, never from the request body) |

Any other path → NestJS default `404`.

---

## auth-service (port 3001; runs on 3009 in this repo's local `.env`)

Owns Swiggy OAuth 2.1 + PKCE, Gusto's session JWT, and encrypted Swiggy
token storage.

| Method | Path | Auth required | Notes |
|---|---|---|---|
| `GET` | `/health` | No | Liveness probe |
| `POST` | `/auth/login/start` | No | Begins PKCE flow; returns `{ authorizationUrl, state }` |
| `POST` | `/auth/login/callback` | No | Completes PKCE flow; returns `{ token, userId }` (Gusto JWT) |
| `POST` | `/auth/token/refresh` | No (JWT-independent) | `{ userId }` → `{ status: "valid", expiresAt }` or `{ status: "reauthentication_required", authorizationUrl, state }` |
| `POST` | `/auth/internal/token` | **None — network-isolation only** | `{ userId }` → `{ token: <plaintext Swiggy access token> }`. Internal-only; called by `mcp-gateway-service`. No auth guard yet — see `prompting_docs/KNOWN_ISSUES.md` item 4. |
| `GET` | `/auth/internal/profile/:userId` | **None — network-isolation only** | Returns `{ userId, prefProfile }` — the user's stored preference profile (`diet`, `spiceLevel`, `cuisineFavorites`, optional `defaultAddressId`/`defaultRestaurantId`). Internal-only; called by `orchestrator-service` and `scheduler-service`. `404` if the user doesn't exist. |

---

## orchestrator-service (port 3002)

Owns the `orchestrator` schema (`workflow_state`). Drives the daily
Scout → Hacker → Approval → Sentinel lifecycle per user.

| Method | Path | Notes |
|---|---|---|
| `GET` | `/health` | Liveness probe |
| `POST` | `/workflow/scout/run` | Body: `{ userId, addressId, restaurantId }`. Called by `scheduler-service` at T-2h. Fetches escrow budget + preference profile + menu, ranks via `ai-agent-service`, optimizes via `coupon-optimization-service`, proposes via `notification-service`. `409` if the user was already scouted today. |
| `POST` | `/workflow/decision` | Body: `{ userId, decision: "APPROVE" \| "SWAP" \| "SKIP" }`. Called by `notification-service`'s decision webhook. APPROVE → calls `order-execution-service`; SKIP → calls `escrow-service`'s rollover; SWAP → re-scouts the next-ranked item. `404` if no workflow exists for today; `409` if not currently awaiting approval. |

Publishes: `ScoutCompleted`, `MenuProposed`, `MealApproved`, `MealSkipped`.
Consumes: `UserAuthenticated` (currently a deliberately inert no-op handler).

---

## coupon-optimization-service (port 3003)

Stateless. Called synchronously by `orchestrator-service` once a cart is
shortlisted.

| Method | Path | Notes |
|---|---|---|
| `GET` | `/health` | Liveness probe |
| `POST` | `/optimize/cart` | Body: `OptimizeCartRequest` — `{ userId, restaurantId, addressId, cartItems, remainingDailyBudget }`. Returns `OptimizedCart` — `{ items, baseCost, fillerCost, discountApplied, finalTotal, savingsAchieved, couponCode?, overBudget, decisionLog }`. `400` on malformed body; degrades gracefully (never 500) if `mcp-gateway-service` or the event bus is unreachable. |

---

## order-execution-service (port 3004)

Owns the `order_execution` schema. The "Sentinel" — places the real Swiggy
order once a user approves, via `escrow-service`'s reserve/capture/release
primitives (never raw `debit()`).

| Method | Path | Notes |
|---|---|---|
| `GET` | `/health` | Liveness probe |
| `POST` | `/orders/execute` | Body: `{ userId, addressId, restaurantId, cart: OptimizedCart, paymentMethod? }`. Called by `orchestrator-service` after APPROVE. Reserves the budget, populates Swiggy's cart, and awaits confirmation. |
| `POST` | `/orders/confirm` | Body: `{ orderId }`. Called once the user's biometric/PIN confirmation is received; places the real Swiggy order (`place_food_order` — non-idempotent, never auto-retried) and captures or releases the reservation depending on outcome. |
| `GET` | `/orders/:orderId/status` | Returns the order's current status. |
| `POST` | `/orders/:orderId/poll-delivery` | Manual trigger for delivery-status polling. **No caller wired yet** — intended for `scheduler-service`'s future executeTime trigger. |

---

## escrow-service (port 3005)

Owns the `escrow` schema exclusively. All money fields are integer paise.
Every mutation runs inside a DB transaction.

| Method | Path | Notes |
|---|---|---|
| `GET` | `/health` | Liveness probe |
| `POST` | `/wallet/deposit` | Body: `{ userId, amount }` (paise). Resets to a fresh 30-day cycle (`totalDeposited`/`currentBalance` set to `amount`, `daysLeft: 30`, `dailyAvgLimit: floor(amount/30)`). `400` on malformed body. |
| `POST` | `/wallet/debit` | Body: `{ userId, amount, savingsAchieved }`. Decrements `currentBalance` directly. `409` if `amount` exceeds `currentBalance`; `404` if no subscription exists. Superseded by reserve/capture/release for order placement — see below. |
| `POST` | `/wallet/rollover` | Body: `{ userId }`. Recomputes `dailyAvgLimit = floor(currentBalance / daysLeft)`; does not touch `currentBalance`/`daysLeft`. Publishes `RolloverApplied`. Called by `orchestrator-service` on SKIP. |
| `POST` | `/wallet/reserve` | Body: `{ userId, amount }`. Holds funds against a pending order before `place_food_order`, without debiting yet. Called by `order-execution-service`. |
| `POST` | `/wallet/capture` | Body: `{ userId, amount }`. Converts a reservation into a real debit after a confirmed Swiggy order placement. Called by `order-execution-service`. |
| `POST` | `/wallet/release` | Body: `{ userId, amount }`. Releases a reservation back to available balance after a failed order placement. Called by `order-execution-service`. |
| `POST` | `/wallet/tick/:userId` | Decrements `daysLeft` by 1, recomputes `dailyAvgLimit`. **No caller wired yet** — intended for a future daily cron. `409` if the cycle has already ended. |
| `GET` | `/wallet/balance/:userId` | Returns the subscription row. `404` if none exists. |
| `GET` | `/wallet/subscription/:userId` | Same shape as `balance/:userId`. Called by `orchestrator-service`'s `EscrowClient.getSubscription()`. |

Consumes: `OrderPlaced` (debits `cart.finalTotal`), `MealSkipped` (triggers
rollover). Publishes: `BudgetUpdated`, `RolloverApplied`. Event-bus publish
failures are best-effort (logged, never fail the HTTP response).

---

## scheduler-service (port 3006)

Owns the `scheduler` schema (`schedule_config`). Fires the daily Scout
trigger per staggered user cohort via direct HTTP to `orchestrator-service`
(not events — timing precision matters here).

| Method | Path | Notes |
|---|---|---|
| `GET` | `/health` | Liveness probe |
| `POST` | `/schedule-config` | Body: `{ userId, scoutTime, notifyTime, executeTime, timezone? }`. Upserts a user's daily trigger windows. **No caller wired yet** — designed ahead of its caller, same pattern as escrow's `tick()`. |

No other routes — `dispatchDueCohorts()` is an internal cron (`*/5 * * * *`),
not an HTTP endpoint. Only `scoutTime` is currently acted on; `notifyTime`/
`executeTime` are stored but unused (`orchestrator-service` has no
corresponding trigger endpoints yet — see `prompting_docs/KNOWN_ISSUES.md`
item 28).

---

## notification-service (port 3007)

Owns the `notification` schema. Multi-channel dispatch (email/push) plus the
inbound decision webhook.

| Method | Path | Notes |
|---|---|---|
| `GET` | `/health` | Liveness probe |
| `POST` | `/notify/preferences` | Body: `{ userId, email?, phone?, pushToken?, pushPlatform?, emailOptOut?, pushOptOut? }`. Upserts a user's contact preferences. `pushToken`/`pushPlatform` must both be present or both absent. |
| `GET` | `/notify/preferences/:userId` | Returns a user's contact preferences. |
| `POST` | `/notify/send` | Body: `{ userId, type, ...payload }`. Called by `orchestrator-service` (`MENU_OF_THE_DAY`) and `order-execution-service`. Dispatches via email/push per the user's preferences and opt-outs. |
| `POST` | `/notify/decision` | Body: `{ userId, decision: "APPROVE" \| "SWAP" \| "SKIP" }`. The inbound webhook for the user's Approve/Swap/Skip action (e.g. from a push notification tap); forwards to `orchestrator-service`'s `POST /workflow/decision`. Upstream errors rethrown with the same status; unreachable → `503`. |

Consumes: `MenuProposed`, `OrderPlaced`, `OrderDelivered` (each drives a
`notify/send`-equivalent dispatch internally).

---

## mcp-gateway-service (port 3008)

Sole caller of Swiggy's MCP tool servers. All three controllers accept a
`:tool` path param naming one of Swiggy's tool names and require an
`x-user-id` header.

| Method | Path | Status | Notes |
|---|---|---|---|
| `GET` | `/health` | Implemented | Liveness probe |
| `POST` | `/mcp/food/:tool` | **Implemented** | Rate-limited (120/min read, 30/min write), cached (5 min TTL on discover/read tools), retried with backoff. 14 Food tools: `get_addresses`, `search_restaurants`, `search_menu`, `get_restaurant_menu`, `get_food_cart`, `update_food_cart`, `flush_food_cart`, `fetch_food_coupons`, `apply_food_coupon`, `place_food_order` (non-idempotent, 1 attempt only), `get_food_orders`, `get_food_order_details`, `track_food_order`, `report_error` |
| `POST` | `/mcp/instamart/:tool` | **Stub** — throws `"Instamart MCP integration not yet implemented (reserved for future use)"` | |
| `POST` | `/mcp/dineout/:tool` | **Stub** — throws `"Dineout MCP integration not yet implemented (reserved for future use)"` | |

---

## ai-agent-service (port 8001, Python/FastAPI)

Stateless. Only service allowed to call the LLM (Claude via LangGraph).

| Method | Path | Notes |
|---|---|---|
| `GET` | `/health` | Liveness probe |
| `POST` | `/ai/scout/analyze` | Body: `{ preferenceProfile, menuItems, weeklyBudget? }` → `{ rankedItems: [{ itemId, semanticTags, matchScore }] }`. 4-node LangGraph: Tagger → Budget Filter → Ranker → Diet Guard. |

---

## Not yet built

`payment-service` — real-money custody for escrow deposits/payouts.
Deliberately deferred until Swiggy production credentials and a frontend
exist; the rest of the backend runs and has been verified end-to-end without
it (escrow-service's ledger is entirely internal paise bookkeeping — no
payment-gateway integration is on the critical path for any endpoint listed
above).

---

## Cross-service auth note

Every protected endpoint above (currently just `api-gateway`'s
`/auth/token/refresh`) is verified with the single shared `verifyJwt()`
function from `@gusto/auth-middleware` — `api-gateway` and `auth-service`
never implement JWT verification separately. See `CLAUDE.md` rule 5.
