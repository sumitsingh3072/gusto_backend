# Gusto Backend Monorepo

Production backend for Gusto — a high-autonomy agentic food-ordering platform built on
Swiggy's MCP servers. This repo contains every Node.js microservice plus the single
Python AI reasoning service, managed as a pnpm + Turborepo monorepo.

## Layout

```
apps/                   One folder per deployable service (see below)
packages/                Shared code: event contracts, event-bus client, logger,
                         config schema, auth middleware, MCP client SDK, shared configs
infra/                   Terraform modules + environments, local docker-compose
.github/workflows/       Per-service CI/CD with path-based filters
docs/adr/                Architecture decision records
```

## Services (apps/)

| Service | Runtime | Owns data? | Purpose |
|---|---|---|---|
| api-gateway | Node/NestJS | no | Public entry point, auth check, routing to internal services |
| auth-service | Node/NestJS | yes (auth schema) | OAuth2.1+PKCE with Swiggy, JWT issuance, encrypted MCP token storage |
| orchestrator-service | Node/NestJS | yes (orchestrator schema) | Owns the daily/30-day workflow state machine; only caller of the AI service |
| coupon-optimization-service | Node/NestJS | no (stateless) | Deterministic "Hacker" cart-optimization algorithm |
| order-execution-service | Node/NestJS | yes (order_execution schema) | Final cart, human-in-the-loop confirmation, order placement/tracking |
| escrow-service | Node/NestJS | yes (escrow schema) | 30-day wallet balance, budget rollover, savings ledger |
| scheduler-service | Node/NestJS | yes (scheduler schema) | Cohort-staggered cron triggers for the daily lifecycle |
| notification-service | Node/NestJS | yes (notification schema) | Outbound push/SMS/email + inbound user decisions |
| mcp-gateway-service | Node/NestJS | no (Redis cache only) | The ONLY service allowed to call Swiggy's 3 MCP servers |
| ai-agent-service | Python/FastAPI | no (stateless) | The ONLY service allowed to call the LLM. No DB, no MCP, no Swiggy access. |

## Why per-service Prisma schemas, not one shared schema

Each stateful service owns an isolated Postgres **schema** (not just a set of tables) inside
one RDS instance, and ships its **own** `prisma/schema.prisma`, its **own** migration
history, and its **own** generated Prisma Client (output to a service-local path so multiple
clients can coexist in the monorepo without colliding). No service imports another
service's Prisma client — cross-service data access always goes through that service's API
or through an emitted event. This is what keeps the system honest as microservices instead
of becoming a shared-database monolith with extra HTTP hops.

Stateless services (`coupon-optimization-service`, `mcp-gateway-service`, `ai-agent-service`)
intentionally have no `prisma/` directory at all.

## Local development

```bash
pnpm install
pnpm docker:up              # Postgres, Redis, LocalStack (SQS/EventBridge) for local dev
pnpm prisma:migrate:dev      # runs migrations for every service that owns a schema
pnpm dev                     # runs all services in parallel via Turborepo
```

## Companion docs

- `Gusto_Architecture_Explained.docx` — what every component does and why
- `Gusto_Service_Boundaries_Spec.docx` — exact API/event contracts per service
- Eraser file "gusto" — system diagram + sequence diagram of the daily lifecycle
