import { Module } from "@nestjs/common";
import { WorkflowController } from "./workflow.controller";
import { WorkflowService } from "./workflow.service";
import { WorkflowStateMachine } from "./workflow.state-machine";

@Module({
  controllers: [WorkflowController],
  providers: [WorkflowService, WorkflowStateMachine],
  exports: [WorkflowService],
})
export class WorkflowModule {}
