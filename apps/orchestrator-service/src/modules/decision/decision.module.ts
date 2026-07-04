import { Module } from "@nestjs/common";
import { DecisionController } from "./decision.controller";
import { WorkflowModule } from "../workflow/workflow.module";

@Module({
  imports: [WorkflowModule],
  controllers: [DecisionController],
})
export class DecisionModule {}
