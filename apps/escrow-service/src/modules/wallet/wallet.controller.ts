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
const ReserveRequestSchema = z.object({ userId: z.string().min(1), amount: z.number().int().positive() });
const CaptureRequestSchema = z.object({ userId: z.string().min(1), amount: z.number().int().positive() });
const ReleaseRequestSchema = z.object({ userId: z.string().min(1), amount: z.number().int().positive() });

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

  // Intended future caller: order-execution-service, before place_food_order.
  @Post("reserve")
  reserve(@Body() body: unknown) {
    const parsed = ReserveRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.wallet.reserve(parsed.data.userId, parsed.data.amount);
  }

  // Intended future caller: order-execution-service / OrderPlaced consumer,
  // after a successful order placement whose amount was already reserve()'d.
  @Post("capture")
  capture(@Body() body: unknown) {
    const parsed = CaptureRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.wallet.captureReservation(parsed.data.userId, parsed.data.amount);
  }

  // Intended future caller: order-execution-service, on a failed order
  // placement whose amount was already reserve()'d.
  @Post("release")
  release(@Body() body: unknown) {
    const parsed = ReleaseRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.wallet.releaseReservation(parsed.data.userId, parsed.data.amount);
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
