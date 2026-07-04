# coupon-optimization-service ("the Hacker")

Deterministic combinatorial cart math -- no LLM call, no database. Simulates
cart combinations to find the best discount-to-cost ratio: Total = min(B,
(B + ΣFillers) - D). Stateless by design; reads menu/coupon data live via
mcp-gateway-service on every request.

Publishes: CartOptimized
Consumes: ScoutCompleted
Calls: mcp-gateway-service
