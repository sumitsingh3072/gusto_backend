import { Injectable } from "@nestjs/common";
import { RolloverService } from "../rollover/rollover.service";

/**
 * Owns subscriptions.* with strict transactional consistency -- this is
 * money, so every mutation here runs inside a DB transaction, never as a
 * fire-and-forget eventually-consistent update.
 */
@Injectable()
export class WalletService {
  constructor(private readonly rolloverService: RolloverService) {}

  async deposit(userId: string, amount: number) {
    throw new Error("not implemented in scaffold");
  }

  async debit(userId: string, amount: number, savingsAchieved: number) {
    throw new Error("not implemented in scaffold");
  }

  async rollover(userId: string) {
    return this.rolloverService.redistribute(userId);
  }

  async getBalance(userId: string) {
    throw new Error("not implemented in scaffold");
  }
}
