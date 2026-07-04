import { Body, Controller, Post } from "@nestjs/common";
import { HackerService } from "./hacker.service";

@Controller("optimize")
export class HackerController {
  constructor(private readonly hacker: HackerService) {}

  // POST /optimize/cart -- called only by orchestrator-service
  @Post("cart")
  optimizeCart(@Body() body: { shortlist: unknown }) {
    return this.hacker.optimize(body.shortlist);
  }
}
