import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { WalletService } from "./wallet.service";

@Controller("wallet")
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @Post("deposit")
  deposit(@Body() body: { userId: string; amount: number }) {
    return this.wallet.deposit(body.userId, body.amount);
  }

  @Post("debit")
  debit(@Body() body: { userId: string; amount: number; savingsAchieved: number }) {
    return this.wallet.debit(body.userId, body.amount, body.savingsAchieved);
  }

  @Post("rollover")
  rollover(@Body() body: { userId: string }) {
    return this.wallet.rollover(body.userId);
  }

  @Get("balance/:userId")
  balance(@Param("userId") userId: string) {
    return this.wallet.getBalance(userId);
  }
}
