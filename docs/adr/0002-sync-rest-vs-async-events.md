# ADR 0002: Synchronous REST vs. asynchronous events between services

## Context

Every service in this repo has both an HTTP API and, in most cases, event
publishers wired to `@gusto/event-bus` (SQS/EventBridge, LocalStack in
dev). In practice the two communication styles have coexisted without a
written rule for when a new inter-service call should use one or the
other — `KNOWN_ISSUES.md` items 8 and 21 both flagged this as a gap the
next stubbed service's author would otherwise have to guess at.

Looking at what's actually been built across Phases 1-4 of this repo's
implementation, a consistent pattern already exists in practice; this ADR
just makes it explicit.

## Decision

**Use synchronous REST when the caller needs the callee's answer before it
can proceed**, and **use an async event when the caller doesn't need to
wait for anything back**.

Concretely, in this codebase:

- `orchestrator-service` calling `escrow-service` (`getSubscription`,
  `reserve`, `rollover`), `auth-service` (`getPreferenceProfile`),
  `ai-agent-client` (`analyze`), `coupon-optimization-service`
  (`optimizeCart`), and `order-execution-service` (`executeOrder`) are all
  synchronous REST calls — every one of these is a step in a linear
  workflow where the next step's input is the previous step's output.
  There is nothing meaningful `runScoutPhase` or `handleUserDecision`
  could do without that answer; an event with no response channel would
  just reintroduce the wait via polling.
- `escrow-service` publishing `BudgetUpdated`, `order-execution-service`
  publishing `OrderPlaced`/`OrderFailed`/`OrderDelivered`,
  `orchestrator-service` publishing `ScoutCompleted`/`MenuProposed`/
  `MealApproved`/`MealSkipped`, and `auth-service` publishing
  `UserAuthenticated` are all async events — none of these publishers'
  callers need (or wait for) an answer; every publish call in this
  codebase is wrapped in try/catch specifically so a publish failure never
  blocks or fails the request that triggered it.
- **`scheduler-service` is a deliberate, documented exception**: it drives
  `orchestrator-service` via direct synchronous HTTP (`POST
  /workflow/scout/run`, `POST /workflow/notify-reminder`, `POST
  /workflow/finalize`) rather than publishing a "time is up" event, even
  though nothing waits for the response. This is intentional, not an
  oversight — timing precision matters for cohort staggering (the whole
  point of `scheduler-service` existing is to avoid a thundering herd
  against Swiggy at the top of every hour), and an event-bus hop adds
  non-deterministic latency an HTTP call doesn't. `scheduler-service`
  itself has no event-bus dependency at all.

## Rule of thumb for the next new service

Ask: **does the calling code have a next step that depends on this call's
return value?**

- Yes → synchronous REST. Add the client to `src/clients/`, matching the
  existing `mapUpstreamError` convention (upstream error response →
  rethrow with the same status; upstream unreachable → 503).
- No → async event via `@gusto/event-bus`'s `EventPublisher`, wrapped in
  try/catch so a publish failure never fails the request that triggered
  it. Use `@gusto/contracts`' existing zod schemas for the payload.
- If the call is timing-critical (must happen at a specific moment, not
  "eventually") — synchronous REST even if nothing consumes the response,
  following `scheduler-service`'s precedent, and document the exception
  the same way `scheduler-service`'s own module comments do.

## Consequences

- No new communication style needs inventing for a normal workflow step —
  the answer is almost always "REST, because the next line of code needs
  the return value."
- Every event consumer across the codebase remains stubbed today
  (`KNOWN_ISSUES.md` item 7) — this ADR doesn't change that, it only
  governs which calls SHOULD be events once consumers exist. The one-way
  broadcast is a real, tracked gap, not something this decision papers
  over.
- `scheduler-service`'s exception must be re-justified, not copied
  reflexively, if a future service is tempted to skip the event bus for
  convenience rather than genuine timing precision.
