import { BadRequestException, Body, Controller, Get, Param, Post } from "@nestjs/common";
import { z } from "zod";
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from "@nestjs/swagger";
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

@ApiTags("Wallet")
@ApiBearerAuth()
@Controller("wallet")
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @Post("deposit")
  @ApiOperation({ summary: "Deposit funds", description: "Deposits funds into a user's wallet." })
  @ApiResponse({ status: 200, description: "Funds deposited successfully" })
  @ApiResponse({ status: 400, description: "Invalid request body" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  deposit(@Body() body: unknown) {
    const parsed = DepositRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.wallet.deposit(parsed.data.userId, parsed.data.amount);
  }

  @Post("debit")
  @ApiOperation({ summary: "Debit funds", description: "Debits funds from a user's wallet, recording savings achieved." })
  @ApiResponse({ status: 200, description: "Funds debited successfully" })
  @ApiResponse({ status: 400, description: "Invalid request body" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  debit(@Body() body: unknown) {
    const parsed = DebitRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.wallet.debit(parsed.data.userId, parsed.data.amount, parsed.data.savingsAchieved);
  }

  @Post("rollover")
  @ApiOperation({ summary: "Rollover unused funds", description: "Rolls over unused wallet balance for a user." })
  @ApiResponse({ status: 200, description: "Funds rolled over successfully" })
  @ApiResponse({ status: 400, description: "Invalid request body" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  rollover(@Body() body: unknown) {
    const parsed = RolloverRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.wallet.rollover(parsed.data.userId);
  }

  // Intended future caller: order-execution-service, before place_food_order.
  @Post("reserve")
  @ApiOperation({ summary: "Reserve funds", description: "Reserves funds in a user's wallet before order placement." })
  @ApiResponse({ status: 200, description: "Funds reserved successfully" })
  @ApiResponse({ status: 400, description: "Invalid request body" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  reserve(@Body() body: unknown) {
    const parsed = ReserveRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.wallet.reserve(parsed.data.userId, parsed.data.amount);
  }

  // Intended future caller: order-execution-service / OrderPlaced consumer,
  // after a successful order placement whose amount was already reserve()'d.
  @Post("capture")
  @ApiOperation({ summary: "Capture reserved funds", description: "Captures previously reserved funds after a successful order." })
  @ApiResponse({ status: 200, description: "Funds captured successfully" })
  @ApiResponse({ status: 400, description: "Invalid request body" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  capture(@Body() body: unknown) {
    const parsed = CaptureRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.wallet.captureReservation(parsed.data.userId, parsed.data.amount);
  }

  // Intended future caller: order-execution-service, on a failed order
  // placement whose amount was already reserve()'d.
  @Post("release")
  @ApiOperation({ summary: "Release reserved funds", description: "Releases previously reserved funds on a failed order." })
  @ApiResponse({ status: 200, description: "Funds released successfully" })
  @ApiResponse({ status: 400, description: "Invalid request body" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  release(@Body() body: unknown) {
    const parsed = ReleaseRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.wallet.releaseReservation(parsed.data.userId, parsed.data.amount);
  }

  // Intended caller: scheduler-service's future daily cron; not wired to
  // anything yet.
  @Post("tick/:userId")
  @ApiOperation({ summary: "Execute daily wallet tick", description: "Triggers daily wallet processing for a user. Intended caller is scheduler-service's cron." })
  @ApiParam({ name: "userId", description: "The user ID to tick" })
  @ApiResponse({ status: 200, description: "Tick executed successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  tick(@Param("userId") userId: string) {
    return this.wallet.tick(userId);
  }

  @Get("balance/:userId")
  @ApiOperation({ summary: "Get wallet balance", description: "Returns the current wallet balance for a user." })
  @ApiParam({ name: "userId", description: "The user ID" })
  @ApiResponse({ status: 200, description: "Balance returned" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  balance(@Param("userId") userId: string) {
    return this.wallet.getBalance(userId);
  }

  // Intended future caller: orchestrator-service's EscrowClient.getSubscription().
  // That client currently expects totalAmount/spentSoFar/mealsRemaining (see
  // prompting_docs/KNOWN_ISSUES.md item 1); orchestrator's own mapping layer
  // will need to translate this real shape rather than escrow-service
  // renaming its fields -- see prompting_docs/escrow-service-developer-docs.md.
  @Get("subscription/:userId")
  @ApiOperation({ summary: "Get subscription info", description: "Returns subscription details for a user's wallet." })
  @ApiParam({ name: "userId", description: "The user ID" })
  @ApiResponse({ status: 200, description: "Subscription info returned" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  subscription(@Param("userId") userId: string) {
    return this.wallet.getSubscription(userId);
  }
}
