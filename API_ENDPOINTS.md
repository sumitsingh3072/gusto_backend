# Gusto Backend — API Endpoints

Every HTTP endpoint currently exposed by the implemented services, verified
directly against each service's controllers. Services not listed here
(`orchestrator-service`, `order-execution-service`, `escrow-service`,
`scheduler-service`, `notification-service`) are scaffolded but stubbed —
see `CLAUDE.md` for status.

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
| `POST` | `/auth/internal/token` | **None — network-isolation only** | `{ userId }` → `{ token: <plaintext Swiggy access token> }`. Internal-only; called by `mcp-gateway-service`. No auth guard yet — see `docs/KNOWN_ISSUES.md`. |

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

## coupon-optimization-service (port 3003)

Stateless. Called synchronously by `orchestrator-service` once a cart is
shortlisted.

| Method | Path | Notes |
|---|---|---|
| `GET` | `/health` | Liveness probe |
| `POST` | `/optimize/cart` | **Implemented.** Body: `OptimizeCartRequest` — `{ userId, restaurantId, addressId, cartItems, remainingDailyBudget }`. Returns `OptimizedCart` — `{ items, baseCost, fillerCost, discountApplied, finalTotal, savingsAchieved, couponCode?, overBudget, decisionLog }`. `400` on malformed body; degrades gracefully (never 500) if `mcp-gateway-service` or the event bus is unreachable. |

---

## Cross-service auth note

Every protected endpoint above (currently just `api-gateway`'s
`/auth/token/refresh`) is verified with the single shared `verifyJwt()`
function from `@gusto/auth-middleware` — `api-gateway` and `auth-service`
never implement JWT verification separately. See `CLAUDE.md` rule 5.
