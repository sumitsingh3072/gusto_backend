import { Module } from "@nestjs/common";
import { DecisionWebhookController } from "./decision-webhook.controller";
import { OrchestratorClient } from "../../clients/orchestrator.client";

@Module({
  controllers: [DecisionWebhookController],
  providers: [OrchestratorClient],
})
export class InboundModule {}
