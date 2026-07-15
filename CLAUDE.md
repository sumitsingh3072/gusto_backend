# CLAUDE.md

Guidance for Claude Code (or any AI coding agent) working in this repository.

## What this repo is

Gusto backend: a pnpm + Turborepo monorepo of 9 NestJS/TypeScript microservices
plus 1 Python/FastAPI service, implementing an agentic food-ordering platform on
top of Swiggy's MCP servers. Full architecture detail lives in
`docs/BACKEND_ARCHITECTURE.md` and `docs/REPOSITORY_OVERVIEW.md` — read those
before making non-trivial changes. Per-service implementation specs live in
`prompting_docs/*.md`.

## Critical architectural rules — never violate these

1. **Only `ai-agent-service` talks to the LLM.** Never add Anthropic/OpenAI/any
   LLM client to a Node service. If a Node service needs "AI judgment," it calls
   `ai-agent-service` over HTTP, full stop.
2. **Only `mcp-gateway-service` calls Swiggy's MCP tool servers**
   (`mcp.swiggy.com/{food,instamart,dineout}`). Every other service reaches
   Swiggy tools exclusively through `@gusto/mcp-client-sdk`'s `McpGatewayClient`.
   Never add a direct axios/fetch call to `mcp.swiggy.com` anywhere else.
3. **Only `auth-service` talks to Swiggy's OAuth server** and only
   `auth-service` ever decrypts the Swiggy access token. Other services that
   need it call `POST auth-service:/auth/internal/token` — they never store or
   cache Swiggy tokens themselves beyond `mcp-gateway-service`'s existing 30s
   in-memory layer.
4. **No service imports another service's generated Prisma client.** Each
   stateful service owns one Postgres schema and its own `prisma/schema.prisma`.
   Cross-service data access is HTTP or events, never a cross-schema Prisma
   query or a cross-schema FK.
5. **JWT verification has exactly one implementation**: `verifyJwt()` in
   `@gusto/auth-middleware`. `auth-service` and `api-gateway` both call it. Never
   reimplement JWT verification locally in a new service.
6. **Fail-closed auth by default.** New routes in any gateway/guarded service are
   protected unless explicitly marked public (e.g. `@Public()` in
   api-gateway). Don't invert this to opt-in guards.
7. **Never trust a client-supplied `userId` once identity is established.**
   Once a JWT guard has verified a caller, any endpoint needing that caller's
   own `userId` must take it from the verified token's `sub` claim, not from
   the request body — see `api-gateway`'s `/auth/token/refresh` for the
   reference pattern.

## Current implementation status (read before assuming a service "works")

**Fully implemented, real business logic:** `auth-service`, `api-gateway`,
`mcp-gateway-service`, `ai-agent-service`, `coupon-optimization-service`,
`escrow-service`, `order-execution-service`, `notification-service`.

**Scaffolded but stubbed** (real Prisma schema/DTOs/controllers/event
publishers, but every service method and every event consumer body is
`throw new Error("not implemented in scaffold")`): `orchestrator-service`
(4 stubs: `WorkflowStateMachine.canTransition()`,
`WorkflowService.runScoutPhase()`, `WorkflowService.handleUserDecision()`,
`user-authenticated.consumer.ts`), `scheduler-service` (1 stub:
`dispatchDueCohorts()` — cron wiring and `OrchestratorClient.triggerScoutRun()`
already real).

**Not yet started, no scaffold exists:** `payment-service` — real-money
custody for `escrow-service` deposits/payouts is entirely unimplemented (no
payment-gateway integration anywhere in this repo). See
`prompting_docs/payment-service-integration-notes.md` for the recommended
architecture (use a payment aggregator's nodal-account product — Razorpay
Route/Cashfree Easy Split/Setu/Decentro — rather than self-custody) and the
exact additive changes this requires in `escrow-service`.

**Suggested build order for what's left:** `orchestrator-service` next — it
ties together `ai-agent-service`, `coupon-optimization-service`,
`escrow-service`, `order-execution-service`, and `notification-service`, all
already real. Then `scheduler-service` (smallest gap — cron wiring and
`OrchestratorClient.triggerScoutRun()` are already real, only
`dispatchDueCohorts()` itself is stubbed). `payment-service` should land
before any of this touches real money in production, but has no hard
ordering dependency on the others.

Do not assume a stubbed service's methods do anything — check the actual
method body before building on top of it, and don't be surprised by a thrown
error in dev. When implementing one of these, `prompting_docs/` and each
service's own `README.md` describe the intended design.

**Known cross-service contract gap (narrowed):** `orchestrator-service`
expects an escrow subscription shape
(`totalAmount`/`spentSoFar`/`mealsRemaining`) that doesn't match
`escrow-service`'s actual Prisma model
(`totalDeposited`/`currentBalance`/`daysLeft`). `escrow-service` now exposes
`GET /wallet/subscription/:userId` with the real shape — the remaining work
is entirely on orchestrator's side: add a `getSubscription()` method to its
`EscrowClient` plus a mapping layer (see
`prompting_docs/escrow-service-developer-docs.md` §10) before wiring
orchestrator's escrow integration for real.

## Conventions to follow when adding code

- **Module layout**: mirror `auth-service`'s structure —
  `main.ts` / `app.module.ts` / `config/configuration.ts` (zod schema, parsed
  once at boot, fail-fast on missing/invalid vars) / `prisma/` (if stateful) /
  `events/{publishers,consumers}/` / `modules/<feature>/`.
- **Config validation**: every service parses its own env vars via zod in
  `config/configuration.ts` at import time. Extend `@gusto/config`'s
  `baseEnvSchema` where practical rather than re-declaring the 4 shared vars
  (`NODE_ENV`, `LOG_LEVEL`, `EVENT_BUS_ENDPOINT`, `EVENT_BUS_REGION`) from
  scratch — existing services don't consistently do this yet; new code should.
- **tsconfig gotcha**: every new service's `tsconfig.json` must explicitly set
  `outDir`/`rootDir`/`include`/`exclude` (copy `auth-service/tsconfig.json`'s
  pattern) — inheriting `@gusto/tsconfig/base.json` without these overrides
  silently breaks the build once real source files are added.
- **HTTP forwarding**: use explicit per-route methods with `axios` (see
  `api-gateway`'s `AuthProxyService` / `auth-service`'s
  `OAuthService.requestToken()`), not a generic wildcard reverse proxy —
  NestJS's Express body parser consumes the request stream, which breaks naive
  proxy middleware for POST bodies.
- **Error mapping on upstream calls**: upstream error response → rethrow with
  the same status; upstream unreachable → map to `ServiceUnavailableException`
  (503), never leak raw axios errors or stack traces to a client. Always set an
  explicit request timeout.
- **Events**: use `@gusto/contracts`' existing zod schemas for any event
  payload; use `@gusto/event-bus`'s `EventPublisher`/`EventSubscriber`, don't
  hand-roll SQS/EventBridge calls.
- **Money**: always integer paise internally, never floating-point rupees —
  see the coupon-optimization design doc §7.1 for the reasoning. Convert to
  rupees only at the display/logging boundary.
- **Idempotency**: `place_food_order` (and by extension any order-placement
  code path) must never be retried automatically — it is explicitly
  non-idempotent in the MCP gateway's retry logic. Any retry-safe wrapper
  around order placement is a bug.
- **Testing**: match `auth-service`'s Jest setup (`jest.config.js`,
  `test/jest.setup.ts` priming env vars before any module import, since
  `configuration.ts` parses `process.env` at import time). Mock `axios`
  the same way `oauth.service.spec.ts` does for upstream-call tests.

## Common commands

```bash
pnpm install                              # workspace install
pnpm docker:up / pnpm docker:down         # Postgres + Redis + LocalStack
pnpm prisma:migrate:dev                   # migrate every service with a schema
pnpm dev                                  # run all services, parallel, watch mode
pnpm --filter <service> dev               # run one service only
pnpm build / pnpm lint / pnpm test        # turbo-orchestrated, repo-wide
pnpm --filter <service> exec tsc -p tsconfig.json --noEmit   # typecheck one service
```

Service ports (default, from each `configuration.ts`):
api-gateway 3000, auth-service 3001, orchestrator-service 3002,
coupon-optimization-service 3003, order-execution-service 3004,
escrow-service 3005, scheduler-service 3006, notification-service 3007,
mcp-gateway-service 3008, ai-agent-service 8001.

## Before calling a change "done"

- Run the relevant service's typecheck/build/lint/test (`pnpm --filter
  <service> ...`), don't just eyeball it.
- If you touched a Prisma schema, run `pnpm prisma:migrate:dev` and confirm the
  generated client reflects the change.
- If you touched auth/JWT logic, verify `api-gateway` and `auth-service` still
  agree (same `JWT_SECRET`, same `verifyJwt` behavior) — they must never drift.
- If you implemented a previously-stubbed method, check whether its event
  consumer counterpart (if any) also needs implementing to make the flow
  actually work end-to-end, not just compile.
- For anything touching money (escrow, coupon optimization, order totals),
  double-check the paise-vs-rupee convention and that discounts can't produce
  a negative total.
