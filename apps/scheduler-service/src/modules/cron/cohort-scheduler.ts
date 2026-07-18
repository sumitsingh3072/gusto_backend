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

function minutesOfDayUtc(date: Date): number {
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

/**
 * Fires the T-2h / T-1h / T-30m lifecycle triggers per staggered user
 * cohort (read from schedule_config) rather than one global cron tick, so
 * Gusto doesn't send a burst of simultaneous requests to Swiggy at the top
 * of every hour.
 *
 * All three windows are now acted on (KNOWN_ISSUES.md item 28, resolved):
 * scoutTime (T-2h) triggers the Scout phase, notifyTime (T-1h) triggers a
 * reminder if the user still hasn't decided, executeTime (T-30m) auto-
 * finalizes to SKIP if still undecided. Each has its own
 * last-fired-today tracking column since they fire at different times of
 * day for the same row -- a single shared column (the old
 * lastDispatchedDate-only design) would have made the row invisible to the
 * later checks once the first one fired.
 *
 * "Due" compares each time column's UTC time-of-day directly against now --
 * the `timezone` column is stored but not yet applied as a real
 * conversion, a documented, deliberately out-of-scope gap for this fix.
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
    const nowMinutesUtc = minutesOfDayUtc(now);

    const dueRows = await this.prisma.scheduleConfig.findMany({
      where: {
        OR: [
          { lastDispatchedDate: null },
          { lastDispatchedDate: { lt: today } },
          { lastNotifiedDate: null },
          { lastNotifiedDate: { lt: today } },
          { lastFinalizedDate: null },
          { lastFinalizedDate: { lt: today } },
        ],
      },
    });

    for (const row of dueRows) {
      const alreadyScoutedToday = !!row.lastDispatchedDate && row.lastDispatchedDate >= today;
      if (!alreadyScoutedToday && nowMinutesUtc >= minutesOfDayUtc(row.scoutTime)) {
        await this.dispatchScout(row, today);
      }

      const alreadyNotifiedToday = !!row.lastNotifiedDate && row.lastNotifiedDate >= today;
      if (!alreadyNotifiedToday && nowMinutesUtc >= minutesOfDayUtc(row.notifyTime)) {
        await this.dispatchNotifyReminder(row.id, row.userId, today);
      }

      const alreadyFinalizedToday = !!row.lastFinalizedDate && row.lastFinalizedDate >= today;
      if (!alreadyFinalizedToday && nowMinutesUtc >= minutesOfDayUtc(row.executeTime)) {
        await this.dispatchFinalize(row.id, row.userId, today);
      }
    }
  }

  private async dispatchScout(row: { id: string; userId: string }, today: Date): Promise<void> {
    try {
      const profile = await this.auth.getPreferenceProfile(row.userId);
      const parsed = PreferenceProfileSchema.safeParse(profile.prefProfile);
      if (!parsed.success || !parsed.data.defaultAddressId || !parsed.data.defaultRestaurantId) {
        logger.warn({ userId: row.userId }, "no default address/restaurant on file -- skipping scout dispatch");
        return;
      }

      await this.orchestrator.triggerScoutRun(row.userId, parsed.data.defaultAddressId, parsed.data.defaultRestaurantId);

      await this.prisma.scheduleConfig.update({ where: { id: row.id }, data: { lastDispatchedDate: today } });
    } catch (err) {
      logger.error({ userId: row.userId, err: err instanceof Error ? err.message : err }, "failed to dispatch scout run");
    }
  }

  private async dispatchNotifyReminder(rowId: string, userId: string, today: Date): Promise<void> {
    try {
      await this.orchestrator.triggerNotifyReminder(userId);
      await this.prisma.scheduleConfig.update({ where: { id: rowId }, data: { lastNotifiedDate: today } });
    } catch (err) {
      logger.error({ userId, err: err instanceof Error ? err.message : err }, "failed to dispatch notify reminder");
    }
  }

  private async dispatchFinalize(rowId: string, userId: string, today: Date): Promise<void> {
    try {
      await this.orchestrator.triggerFinalize(userId);
      await this.prisma.scheduleConfig.update({ where: { id: rowId }, data: { lastFinalizedDate: today } });
    } catch (err) {
      logger.error({ userId, err: err instanceof Error ? err.message : err }, "failed to dispatch finalize");
    }
  }
}
