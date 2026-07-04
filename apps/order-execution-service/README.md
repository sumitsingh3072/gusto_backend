# order-execution-service ("the Sentinel")

Owns the `order_execution` schema (`orders` table) exclusively. Populates the
final cart, enforces the human-in-the-loop biometric/PIN confirmation gate,
places the order through mcp-gateway-service, and polls delivery status.

Publishes: OrderPlaced, OrderDelivered, OrderFailed
Consumes: MealApproved, CartOptimized
Calls: mcp-gateway-service, escrow-service, notification-service
