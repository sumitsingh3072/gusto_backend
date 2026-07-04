/**
 * Emitted by the owning service and consumed by any interested downstream
 * service via the shared event bus (SQS/EventBridge). Keep payloads minimal —
 * an event should carry an ID and just enough context to act on it, not a
 * full denormalized snapshot of another service's data.
 */
export interface RolloverAppliedEvent {
  eventId: string;
  occurredAt: string; // ISO-8601
  userId: string;
}
