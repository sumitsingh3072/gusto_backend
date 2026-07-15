import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { createLogger } from "@gusto/logger";
import { PrismaService } from "../../prisma/prisma.service";
import { RolloverService } from "../rollover/rollover.service";
import { BudgetUpdatedPublisher } from "../../events/publishers/budget-updated.publisher";

const logger = createLogger("escrow-service:wallet-service");
const CYCLE_DAYS = 30;

/**
 * Owns subscriptions.* with strict transactional consistency -- this is
 * money, so every mutation here runs inside a DB transaction, never as a
 * fire-and-forget eventually-consistent update.
 */
@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rolloverService: RolloverService,
    private readonly publisher: BudgetUpdatedPublisher,
  ) {}

  // Deposit always starts a FRESH 30-day cycle: it does not add to a
  // partially-spent existing balance, it replaces totalDeposited/
  // currentBalance/daysLeft/dailyAvgLimit wholesale via upsert.
  async deposit(userId: string, amount: number) {
    if (amount <= 0) throw new ConflictException("deposit amount must be positive paise");
    const dailyAvgLimit = Math.floor(amount / CYCLE_DAYS);
    const sub = await this.prisma.subscription.upsert({
      where: { userId },
      create: { userId, totalDeposited: amount, currentBalance: amount, daysLeft: CYCLE_DAYS, dailyAvgLimit },
      update: { totalDeposited: amount, currentBalance: amount, daysLeft: CYCLE_DAYS, dailyAvgLimit },
    });
    await this.publishBudgetUpdated(sub);
    return sub;
  }

  // Debit guards against overdraft -- an order that would drive the balance
  // negative is rejected with 409, never silently clamped to zero.
  async debit(userId: string, amount: number, savingsAchieved: number) {
    if (amount <= 0) throw new ConflictException("debit amount must be positive paise");
    const updated = await this.prisma.$transaction(async (tx) => {
      const sub = await tx.subscription.findUnique({ where: { userId } });
      if (!sub) throw new NotFoundException(`no subscription for userId ${userId}`);
      if (sub.currentBalance < amount) {
        throw new ConflictException(
          `debit of ${amount} paise exceeds current balance ${sub.currentBalance} paise`,
        );
      }
      const result = await tx.subscription.update({
        where: { userId },
        data: { currentBalance: sub.currentBalance - amount },
      });
      logger.info({ userId, amount, savingsAchieved }, "debited subscription");
      return result;
    });
    await this.publishBudgetUpdated(updated);
    return updated;
  }

  // Decrements daysLeft by 1 and recomputes dailyAvgLimit over what's left.
  // No caller wired yet -- intended for scheduler-service's future daily
  // cron; designed ahead of that integration so the contract exists now.
  async tick(userId: string) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const sub = await tx.subscription.findUnique({ where: { userId } });
      if (!sub) throw new NotFoundException(`no subscription for userId ${userId}`);
      if (sub.daysLeft <= 0) {
        throw new ConflictException(`subscription for userId ${userId} has no days left in its cycle; redeposit required`);
      }
      const daysLeft = sub.daysLeft - 1;
      const dailyAvgLimit = daysLeft > 0 ? Math.floor(sub.currentBalance / daysLeft) : sub.currentBalance;
      return tx.subscription.update({
        where: { userId },
        data: { daysLeft, dailyAvgLimit },
      });
    });
    await this.publishBudgetUpdated(updated);
    return updated;
  }

  async rollover(userId: string) {
    return this.rolloverService.redistribute(userId);
  }

  async getBalance(userId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub) throw new NotFoundException(`no subscription for userId ${userId}`);
    return sub;
  }

  // Same shape as getBalance -- separate method name for the dedicated read
  // endpoint that unblocks orchestrator-service's future EscrowClient.
  async getSubscription(userId: string) {
    return this.getBalance(userId);
  }

  private async publishBudgetUpdated(sub: { userId: string; currentBalance: number; dailyAvgLimit: number }) {
    // Best-effort side channel -- an unreachable event bus must never turn a
    // successful money mutation into a 500 for the caller.
    try {
      await this.publisher.publish({
        eventId: randomUUID(),
        occurredAt: new Date().toISOString(),
        userId: sub.userId,
        currentBalance: sub.currentBalance,
        dailyAvgLimit: sub.dailyAvgLimit,
      });
    } catch (err) {
      logger.warn({ err, userId: sub.userId }, "failed to publish BudgetUpdated; mutation already committed");
    }
  }
}
