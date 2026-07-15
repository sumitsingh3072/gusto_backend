import { BadRequestException, Body, Controller, Get, Param, Post } from "@nestjs/common";
import { z } from "zod";
import { WalletService } from "./wallet.service";

// Local, internal-only schemas -- no other service posts to these bodies
// with a shared contract type today.
const DepositRequestSchema = z.object({ userId: z.string().min(1), amount: z.number().int().positive() });
const DebitRequestSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().int().positive(),
  savingsAchieved: z.number().int().nonnegative(),
});
const RolloverRequestSchema = z.object({ userId: z.string().min(1) });

@Controller("wallet")
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @Post("deposit")
  deposit(@Body() body: unknown) {
    const parsed = DepositRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.wallet.deposit(parsed.data.userId, parsed.data.amount);
  }

  @Post("debit")
  debit(@Body() body: unknown) {
    const parsed = DebitRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.wallet.debit(parsed.data.userId, parsed.data.amount, parsed.data.savingsAchieved);
  }

  @Post("rollover")
  rollover(@Body() body: unknown) {
    const parsed = RolloverRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.wallet.rollover(parsed.data.userId);
  }

  // Intended caller: scheduler-service's future daily cron; not wired to
  // anything yet.
  @Post("tick/:userId")
  tick(@Param("userId") userId: string) {
    return this.wallet.tick(userId);
  }

  @Get("balance/:userId")
  balance(@Param("userId") userId: string) {
    return this.wallet.getBalance(userId);
  }

  // Intended future caller: orchestrator-service's EscrowClient.getSubscription().
  // That client currently expects totalAmount/spentSoFar/mealsRemaining (see
  // prompting_docs/KNOWN_ISSUES.md item 1); orchestrator's own mapping layer
  // will need to translate this real shape rather than escrow-service
  // renaming its fields -- see prompting_docs/escrow-service-developer-docs.md.
  @Get("subscription/:userId")
  subscription(@Param("userId") userId: string) {
    return this.wallet.getSubscription(userId);
  }
}
