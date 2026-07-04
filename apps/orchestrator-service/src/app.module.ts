import { Module } from "@nestjs/common";
import { HealthController } from "./health/health.controller";
import { WorkflowModule } from "./modules/workflow/workflow.module";
import { DecisionModule } from "./modules/decision/decision.module";

@Module({
  imports: [WorkflowModule, DecisionModule],
  controllers: [HealthController],
})
export class AppModule {}
