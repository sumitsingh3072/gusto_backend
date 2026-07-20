import { BadRequestException, Body, Controller, Post } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from "@nestjs/swagger";
import { HackerService } from "./hacker.service";
import { OptimizeCartRequestSchema, OptimizedCart } from "@gusto/contracts";

@ApiTags("Coupon Optimization")
@Controller("optimize")
export class HackerController {
  constructor(private readonly hacker: HackerService) {}

  // POST /optimize/cart -- called only by orchestrator-service
  @Post("cart")
  @ApiOperation({ summary: "Optimize cart with coupons", description: "Computes the optimal coupon stack and item quantities for a cart. Called only by orchestrator-service." })
  @ApiHeader({ name: "X-Internal-Secret", description: "Internal shared secret", required: true })
  @ApiResponse({ status: 200, description: "Optimized cart returned." })
  @ApiResponse({ status: 400, description: "Invalid request body." })
  @ApiResponse({ status: 503, description: "Upstream service unavailable." })
  optimizeCart(@Body() body: unknown): Promise<OptimizedCart> {
    const parsed = OptimizeCartRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.hacker.optimize(parsed.data);
  }
}
