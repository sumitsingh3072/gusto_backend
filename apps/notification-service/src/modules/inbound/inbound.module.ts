import { Module } from "@nestjs/common";
import { DecisionWebhookController } from "./decision-webhook.controller";
import { OrchestratorClient } from "../../clients/orchestrator.client";
import { env } from "../../config/configuration";

@Module({
  controllers: [DecisionWebhookController],
  providers: [
    {
      provide: OrchestratorClient,
      useFactory: () => new OrchestratorClient(env.ORCHESTRATOR_SERVICE_URL),
    },
  ],
})
export class InboundModule {}
