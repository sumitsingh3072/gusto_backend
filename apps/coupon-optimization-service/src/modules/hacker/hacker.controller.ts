import { BadRequestException, Body, Controller, Post } from "@nestjs/common";
import { HackerService } from "./hacker.service";
import { OptimizeCartRequestSchema, OptimizedCart } from "@gusto/contracts";

@Controller("optimize")
export class HackerController {
  constructor(private readonly hacker: HackerService) {}

  // POST /optimize/cart -- called only by orchestrator-service
  @Post("cart")
  optimizeCart(@Body() body: unknown): Promise<OptimizedCart> {
    const parsed = OptimizeCartRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.hacker.optimize(parsed.data);
  }
}
