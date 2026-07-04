# ADR 0001: Microservices with per-service Prisma schemas


## Context
Gusto's product spec requires independent scaling of the Scout/Hacker/Sentinel
agent phases and a hard isolation boundary between the AI reasoning component
and everything with Swiggy/payment access.

## Decision
- Backend is Node.js (NestJS), split into independently deployable
  microservices, one per bounded context (Auth, Orchestrator,
  Coupon-Optimization, Order-Execution, Escrow, Scheduler, Notification,
  MCP Gateway).
- AI/LLM reasoning is isolated in exactly one Python/FastAPI service
  (ai-agent-service), stateless, called only by orchestrator-service.
- Every stateful service owns its own Postgres **schema** and ships its own
  Prisma schema/client/migrations. No service ever imports another
  service's generated Prisma client.
- Only mcp-gateway-service holds Swiggy MCP credentials and calls
  mcp.swiggy.com.
- Cross-service communication is synchronous (REST) when the caller needs
  an immediate answer, and asynchronous (SQS/EventBridge) when it doesn't.

## Consequences
- Adding Instamart/Dineout support later only touches mcp-gateway-service.
- The AI boundary can be swapped/re-prompted without redeploying any Node
  service.
- Slightly more operational surface (9 deployables) in exchange for
  independent scaling and blast-radius containment.
