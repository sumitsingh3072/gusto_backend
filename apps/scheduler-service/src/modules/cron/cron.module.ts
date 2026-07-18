import { Module } from "@nestjs/common";
import { CohortScheduler } from "./cohort-scheduler";
import { OrchestratorClient } from "../../clients/orchestrator.client";
import { AuthClient } from "../../clients/auth.client";
import { env } from "../../config/configuration";

@Module({
  providers: [
    CohortScheduler,
    { provide: OrchestratorClient, useFactory: () => new OrchestratorClient(env.ORCHESTRATOR_SERVICE_URL) },
    { provide: AuthClient, useFactory: () => new AuthClient(env.AUTH_SERVICE_URL, env.INTERNAL_SHARED_SECRET) },
  ],
})
export class CronModule {}
