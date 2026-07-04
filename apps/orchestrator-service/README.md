# orchestrator-service

Owns the daily/30-day workflow state machine (Scout -> Hacker -> Approval ->
Sentinel). Owns the `orchestrator` Postgres schema. The ONLY service allowed
to call ai-agent-service. Delegates coupon math to coupon-optimization-service,
order placement to order-execution-service, and never calls Swiggy directly.

Publishes: ScoutCompleted, MenuProposed, MealApproved, MealSkipped
Consumes: UserAuthenticated
Calls: ai-agent-service, coupon-optimization-service, order-execution-service,
notification-service, escrow-service, mcp-gateway-service
