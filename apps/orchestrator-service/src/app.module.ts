import { Module } from "@nestjs/common";
import { HealthController } from "./health/health.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { WorkflowModule } from "./modules/workflow/workflow.module";
import { DecisionModule } from "./modules/decision/decision.module";
import { EventsModule } from "./events/events.module";

@Module({
  imports: [PrismaModule, WorkflowModule, DecisionModule, EventsModule],
  controllers: [HealthController],
})
export class AppModule {}
