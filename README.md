# Gusto Backend Monorepo

Production backend for Gusto — a high-autonomy agentic food-ordering platform built on
Swiggy's MCP servers. This repo contains every Node.js microservice, the single
Python AI reasoning service, and a mock Swiggy MCP server used for local/CI testing,
managed as a pnpm + Turborepo monorepo.

## Layout

```
apps/                   One folder per deployable service (see below)
packages/                Shared code: event contracts, event-bus client, logger,
                         config schema, auth middleware, MCP client SDK, shared configs
infra/                   Terraform modules + environments, local docker-compose
.github/workflows/       Per-service CI/CD with path-based filters
docs/adr/                Architecture decision records
prompting_docs/          Per-service implementation docs + phase-by-phase testing/fix results
```

## Services (apps/)

| Service | Runtime | Port | Owns data? | Purpose |
|---|---|---|---|---|
| api-gateway | Node/NestJS | 3000 | no | Public entry point, auth check, routing to internal services |
| auth-service | Node/NestJS | 3001 | yes (auth schema) | OAuth2.1+PKCE with Swiggy, JWT issuance + revocation, encrypted MCP token storage |
| orchestrator-service | Node/NestJS | 3002 | yes (orchestrator schema) | Owns the daily/30-day workflow state machine; only caller of the AI service |
| coupon-optimization-service | Node/NestJS | 3003 | no (stateless) | Deterministic "Hacker" cart-optimization algorithm |
| order-execution-service | Node/NestJS | 3004 | yes (order_execution schema) | Final cart, human-in-the-loop confirmation, order placement/tracking |
| escrow-service | Node/NestJS | 3005 | yes (escrow schema) | 30-day wallet balance, budget rollover, savings ledger |
| scheduler-service | Node/NestJS | 3006 | yes (scheduler schema) | Cohort-staggered cron triggers for the daily lifecycle (scout/notify/finalize) |
| notification-service | Node/NestJS | 3007 | yes (notification schema) | Outbound push/SMS/email + inbound user decisions |
| mcp-gateway-service | Node/NestJS | 3008 | no (Redis cache only) | The ONLY service allowed to call Swiggy's 3 MCP servers |
| ai-agent-service | Python/FastAPI | 8001 | no (stateless) | The ONLY service allowed to call the LLM. No DB, no MCP, no Swiggy access. |
| mock-swiggy-service | Node/Express | 3010 | no | Docs-faithful stand-in for Swiggy's real Food MCP server — local/CI testing only, not part of the production topology |

## Why per-service Prisma schemas, not one shared schema

Each stateful service owns an isolated Postgres **schema** (not just a set of tables) inside
one RDS instance, and ships its **own** `prisma/schema.prisma`, its **own** migration
history, and its **own** generated Prisma Client (output to a service-local path so multiple
clients can coexist in the monorepo without colliding). No service imports another
service's Prisma client — cross-service data access always goes through that service's API
or through an emitted event. This is what keeps the system honest as microservices instead
of becoming a shared-database monolith with extra HTTP hops.

Stateless services (`coupon-optimization-service`, `mcp-gateway-service`, `ai-agent-service`,
`mock-swiggy-service`) intentionally have no `prisma/` directory at all.

## Local development

Two ways to run the stack. For a complete, copy-pasteable walkthrough of either path
from a fresh clone — including generating secrets, seeding a test user, and verifying
the whole thing actually works — see
[`prompting_docs/getting-started-from-scratch.md`](prompting_docs/getting-started-from-scratch.md).
The summary:

**Path A — services run directly on the host (`pnpm dev`):**

```bash
pnpm install
pnpm docker:up              # Postgres, Redis, LocalStack (SQS/EventBridge)
pnpm prisma:migrate:dev     # runs migrations for every service that owns a schema
pnpm --filter mock-swiggy-service dev   # mock Swiggy MCP server, needed for any
                                         # meaningful local testing (no real Swiggy
                                         # creds exist in dev) — see phase1 doc below
pnpm dev                    # runs all Node/Python services in parallel via Turborepo
```

**Path B — the whole stack as containers:**

```bash
docker compose -f infra/docker/docker-compose.yml up -d --build
```

Brings up all 10 app services plus Postgres/Redis/LocalStack in one command, every
service reachable by every other over Docker's internal network. See
[`prompting_docs/phase3-dockerization-results.md`](prompting_docs/phase3-dockerization-results.md)
for what's been verified about this path.

## Auth notes

- `POST /auth/internal/token` and `GET /auth/internal/profile/:userId` (auth-service's
  internal-only routes) require an `X-Internal-Secret` header matching the
  `INTERNAL_SHARED_SECRET` env var — every internal caller (mcp-gateway-service,
  orchestrator-service, scheduler-service) needs this set to the same value.
- `POST /auth/logout` revokes the caller's own Gusto JWT via a Redis-backed blocklist —
  both `auth-service` and `api-gateway` need `REDIS_URL` set for this to work.

## Companion docs

- `Gusto_Architecture_Explained.docx` — what every component does and why
- `Gusto_Service_Boundaries_Spec.docx` — exact API/event contracts per service
- Eraser file "gusto" — system diagram + sequence diagram of the daily lifecycle
- [`docs/developer_documentation.md`](docs/developer_documentation.md) — code structure,
  directory layout, port table
- [`docs/adr/`](docs/adr/) — architecture decision records (per-schema databases,
  sync-REST-vs-async-events)
- [`prompting_docs/KNOWN_ISSUES.md`](prompting_docs/KNOWN_ISSUES.md) — full audit of
  known gaps, what's resolved and what's deliberately left open, and why
- `prompting_docs/phase1-mock-swiggy-testing-results.md` through
  `phase4-known-issues-fixes-results.md` — what was built/tested/fixed in each pass,
  in order
- `prompting_docs/getting-started-from-scratch.md` — the definitive, copy-pasteable
  setup walkthrough
