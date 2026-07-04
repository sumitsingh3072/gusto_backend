/**
 * Explicit state machine for a single day's meal cycle:
 * SCOUTING -> OPTIMIZING -> AWAITING_APPROVAL -> (APPROVED -> EXECUTING -> COMPLETE) | SKIPPED
 * Kept as its own class so the valid-transition rules are unit-testable in
 * isolation from the I/O in WorkflowService.
 */
export class WorkflowStateMachine {
  canTransition(from: string, to: string): boolean {
    throw new Error("not implemented in scaffold");
  }
}
