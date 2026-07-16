import { WorkflowStateMachine } from "./workflow.state-machine";

describe("WorkflowStateMachine", () => {
  const machine = new WorkflowStateMachine();

  it.each([
    ["SCOUTING", "OPTIMIZING", true],
    ["OPTIMIZING", "AWAITING_APPROVAL", true],
    ["AWAITING_APPROVAL", "AWAITING_APPROVAL", true],
    ["AWAITING_APPROVAL", "APPROVED", true],
    ["AWAITING_APPROVAL", "SKIPPED", true],
    ["APPROVED", "EXECUTING", true],
    ["EXECUTING", "COMPLETE", true],
  ])("allows %s -> %s", (from, to, expected) => {
    expect(machine.canTransition(from, to)).toBe(expected);
  });

  it.each([
    ["SCOUTING", "AWAITING_APPROVAL"],
    ["SCOUTING", "APPROVED"],
    ["OPTIMIZING", "SCOUTING"],
    ["OPTIMIZING", "APPROVED"],
    ["APPROVED", "SKIPPED"],
    ["APPROVED", "COMPLETE"],
    ["COMPLETE", "SCOUTING"],
    ["SKIPPED", "SCOUTING"],
    ["SKIPPED", "AWAITING_APPROVAL"],
  ])("rejects %s -> %s", (from, to) => {
    expect(machine.canTransition(from, to)).toBe(false);
  });

  it("returns false for unknown states without throwing", () => {
    expect(machine.canTransition("BOGUS", "OPTIMIZING")).toBe(false);
    expect(machine.canTransition("SCOUTING", "BOGUS")).toBe(false);
  });
});
