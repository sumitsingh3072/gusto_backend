import { Injectable } from "@nestjs/common";

/**
 * Explicit state machine for a single day's meal cycle:
 * SCOUTING -> OPTIMIZING -> AWAITING_APPROVAL -> (APPROVED -> EXECUTING -> COMPLETE) | SKIPPED
 * AWAITING_APPROVAL also self-loops (SWAP: re-propose the next-ranked item
 * and stay in AWAITING_APPROVAL rather than modeling swap as its own phase).
 * Kept as its own class so the valid-transition rules are unit-testable in
 * isolation from the I/O in WorkflowService.
 */
const TRANSITIONS: Record<string, string[]> = {
  SCOUTING: ["OPTIMIZING"],
  OPTIMIZING: ["AWAITING_APPROVAL"],
  AWAITING_APPROVAL: ["AWAITING_APPROVAL", "APPROVED", "SKIPPED"],
  APPROVED: ["EXECUTING"],
  EXECUTING: ["COMPLETE"],
  COMPLETE: [],
  SKIPPED: [],
};

@Injectable()
export class WorkflowStateMachine {
  canTransition(from: string, to: string): boolean {
    return TRANSITIONS[from]?.includes(to) ?? false;
  }
}
