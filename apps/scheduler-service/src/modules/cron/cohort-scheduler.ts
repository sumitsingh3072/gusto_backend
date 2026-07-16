import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { createLogger } from "@gusto/logger";
import { PreferenceProfileSchema } from "@gusto/contracts";
import { OrchestratorClient } from "../../clients/orchestrator.client";
import { AuthClient } from "../../clients/auth.client";
import { PrismaService } from "../../prisma/prisma.service";

const logger = createLogger("scheduler-service:cohort-scheduler");

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Fires the T-2h / T-1h / T-30m lifecycle triggers per staggered user
 * cohort (read from schedule_config) rather than one global cron tick, so
 * Gusto doesn't send a burst of simultaneous requests to Swiggy at the top
 * of every hour.
 *
 * Only scoutTime is acted on -- orchestrator-service has no corresponding
 * trigger endpoints for notifyTime/executeTime yet (its runScoutPhase
 * already sends the "Menu of the Day" notification synchronously at scout
 * time). See prompting_docs/KNOWN_ISSUES.md.
 *
 * "Due" compares scoutTime's UTC time-of-day directly against now -- the
 * `timezone` column is stored but not yet applied as a real conversion,
 * same class of documented gap as notifyTime/executeTime above.
 */
@Injectable()
export class CohortScheduler {
  constructor(
    private readonly orchestrator: OrchestratorClient,
    private readonly auth: AuthClient,
    private readonly prisma: PrismaService,
  ) {}

  @Cron("*/5 * * * *") // check every 5 minutes for due cohorts
  async dispatchDueCohorts() {
    const now = new Date();
    const today = startOfUtcDay(now);

    const dueRows = await this.prisma.scheduleConfig.findMany({
      where: {
        OR: [{ lastDispatchedDate: null }, { lastDispatchedDate: { lt: today } }],
      },
    });

    for (const row of dueRows) {
      const scoutMinutesUtc = row.scoutTime.getUTCHours() * 60 + row.scoutTime.getUTCMinutes();
      const nowMinutesUtc = now.getUTCHours() * 60 + now.getUTCMinutes();
      if (nowMinutesUtc < scoutMinutesUtc) continue;

      try {
        const profile = await this.auth.getPreferenceProfile(row.userId);
        const parsed = PreferenceProfileSchema.safeParse(profile.prefProfile);
        if (!parsed.success || !parsed.data.defaultAddressId || !parsed.data.defaultRestaurantId) {
          logger.warn({ userId: row.userId }, "no default address/restaurant on file -- skipping scout dispatch");
          continue;
        }

        await this.orchestrator.triggerScoutRun(
          row.userId,
          parsed.data.defaultAddressId,
          parsed.data.defaultRestaurantId,
        );

        await this.prisma.scheduleConfig.update({
          where: { id: row.id },
          data: { lastDispatchedDate: today },
        });
      } catch (err) {
        logger.error(
          { userId: row.userId, err: err instanceof Error ? err.message : err },
          "failed to dispatch scout run",
        );
      }
    }
  }
}
