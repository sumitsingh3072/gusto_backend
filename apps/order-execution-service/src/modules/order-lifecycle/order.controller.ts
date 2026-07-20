import { BadRequestException, Body, Controller, Get, Param, Post } from "@nestjs/common";
import { z } from "zod";
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from "@nestjs/swagger";
import { OptimizedCartSchema } from "@gusto/contracts";
import { OrderService } from "./order.service";

// ExecuteOrderRequestSchema extends OptimizedCartSchema with addressId/
// restaurantId/paymentMethod -- Swiggy's update_food_cart/place_food_order
// tools need these but neither CartOptimizedEvent nor MealApprovedEvent
// carry them (see prompting_docs/order-execution-service-developer-docs.md
// design decision #1/#2). This is the de facto contract orchestrator-service
// must satisfy once it calls this route for real.
const ExecuteOrderRequestSchema = z.object({
  userId: z.string().min(1),
  addressId: z.string().min(1),
  restaurantId: z.string().min(1),
  cart: OptimizedCartSchema,
  paymentMethod: z.string().optional(),
});

const ConfirmOrderRequestSchema = z.object({ orderId: z.string().min(1) });

@ApiTags("Orders")
@ApiBearerAuth()
@Controller("orders")
export class OrderController {
  constructor(private readonly orders: OrderService) {}

  // POST /orders/execute -- called by orchestrator-service after approval
  @Post("execute")
  @ApiOperation({ summary: "Execute an order", description: "Called by orchestrator-service after meal approval. Populates cart and awaits confirmation." })
  @ApiResponse({ status: 200, description: "Order executed successfully" })
  @ApiResponse({ status: 400, description: "Invalid request body" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  execute(@Body() body: unknown) {
    const parsed = ExecuteOrderRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const { userId, addressId, restaurantId, cart, paymentMethod } = parsed.data;
    return this.orders.populateAndAwaitConfirmation(userId, addressId, restaurantId, cart, paymentMethod);
  }

  // POST /orders/confirm -- biometric/PIN confirmation received
  @Post("confirm")
  @ApiOperation({ summary: "Confirm and place an order", description: "Biometric or PIN confirmation received; triggers actual order placement." })
  @ApiResponse({ status: 200, description: "Order confirmed and placed" })
  @ApiResponse({ status: 400, description: "Invalid request body" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  confirm(@Body() body: unknown) {
    const parsed = ConfirmOrderRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.orders.confirmAndPlace(parsed.data.orderId);
  }

  // GET /orders/:orderId/status
  @Get(":orderId/status")
  @ApiOperation({ summary: "Get order status", description: "Returns the current status of an order." })
  @ApiParam({ name: "orderId", description: "The order ID to check" })
  @ApiResponse({ status: 200, description: "Order status returned" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  status(@Param("orderId") orderId: string) {
    return this.orders.getStatus(orderId);
  }

  // POST /orders/:orderId/poll-delivery -- manual trigger for now; intended
  // future caller is scheduler-service's cron (no caller wired yet, same
  // "designed ahead of its caller" pattern as escrow-service's tick()).
  @Post(":orderId/poll-delivery")
  @ApiOperation({ summary: "Poll delivery status", description: "Manual trigger to poll delivery status. Future caller is scheduler-service's cron." })
  @ApiParam({ name: "orderId", description: "The order ID to poll delivery for" })
  @ApiResponse({ status: 200, description: "Delivery status polled" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  pollDelivery(@Param("orderId") orderId: string) {
    return this.orders.pollDeliveryStatus(orderId);
  }
}
