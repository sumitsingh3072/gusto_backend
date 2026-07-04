import { Controller, Post } from "@nestjs/common";
import { WorkflowService } from "./workflow.service";

@Controller("workflow")
export class WorkflowController {
  constructor(private readonly workflow: WorkflowService) {}

  // POST /workflow/scout/run -- invoked by scheduler-service at T-2h
  @Post("scout/run")
  runScoutPhase() {
    return this.workflow.runScoutPhase();
  }
}
