import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { OrchestratorClient } from "../../clients/orchestrator.client";

/**
 * Fires the T-2h / T-1h / T-30m lifecycle triggers per staggered user
 * cohort (read from schedule_config) rather than one global cron tick, so
 * Gusto doesn't send a burst of simultaneous requests to Swiggy at the top
 * of every hour.
 */
@Injectable()
export class CohortScheduler {
  constructor(private readonly orchestrator: OrchestratorClient) {}

  @Cron("*/5 * * * *") // check every 5 minutes for due cohorts
  async dispatchDueCohorts() {
    throw new Error("not implemented in scaffold");
  }
}
