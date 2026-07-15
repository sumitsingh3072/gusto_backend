import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { createLogger } from "@gusto/logger";
import { PrismaService } from "../../prisma/prisma.service";
import { RolloverAppliedPublisher } from "../../events/publishers/rollover-applied.publisher";

const logger = createLogger("escrow-service:rollover-service");

/**
 * Implements "The Rollover": when a meal is skipped, its budget is
 * redistributed across the remaining days, enabling a "Premium Friday"
 * splurge (steak/sushi, or in future a Dineout MCP table booking).
 *
 * currentBalance/daysLeft are NOT mutated here -- nothing was spent on the
 * skipped meal, so there's nothing to add back to the balance itself; only
 * the forward-looking dailyAvgLimit changes. daysLeft only decrements via
 * WalletService.tick, a separate daily mechanism.
 */
@Injectable()
export class RolloverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publisher: RolloverAppliedPublisher,
  ) {}

  async redistribute(userId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const sub = await tx.subscription.findUnique({ where: { userId } });
      if (!sub) throw new NotFoundException(`no subscription for userId ${userId}`);

      const rolloverAmount = sub.dailyAvgLimit;
      const daysLeft = Math.max(sub.daysLeft, 1); // guard div-by-zero at cycle boundary
      const newDailyLimit = Math.floor(sub.currentBalance / daysLeft);

      const updated = await tx.subscription.update({
        where: { userId },
        data: { dailyAvgLimit: newDailyLimit },
      });
      return { updated, rolloverAmount, newDailyLimit };
    });

    // Best-effort side channel -- an unreachable event bus must never turn a
    // successful recompute into a failure for the caller.
    try {
      await this.publisher.publish({
        eventId: randomUUID(),
        occurredAt: new Date().toISOString(),
        userId,
        rolloverAmount: result.rolloverAmount,
        newDailyLimit: result.newDailyLimit,
      });
    } catch (err) {
      logger.warn({ err, userId }, "failed to publish RolloverApplied; recompute already committed");
    }

    return result.updated;
  }
}
