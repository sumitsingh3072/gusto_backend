import { BadRequestException, Body, Controller, Get, Param, Post } from "@nestjs/common";
import { z } from "zod";
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

@Controller("orders")
export class OrderController {
  constructor(private readonly orders: OrderService) {}

  // POST /orders/execute -- called by orchestrator-service after approval
  @Post("execute")
  execute(@Body() body: unknown) {
    const parsed = ExecuteOrderRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const { userId, addressId, restaurantId, cart, paymentMethod } = parsed.data;
    return this.orders.populateAndAwaitConfirmation(userId, addressId, restaurantId, cart, paymentMethod);
  }

  // POST /orders/confirm -- biometric/PIN confirmation received
  @Post("confirm")
  confirm(@Body() body: unknown) {
    const parsed = ConfirmOrderRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.orders.confirmAndPlace(parsed.data.orderId);
  }

  // GET /orders/:orderId/status
  @Get(":orderId/status")
  status(@Param("orderId") orderId: string) {
    return this.orders.getStatus(orderId);
  }

  // POST /orders/:orderId/poll-delivery -- manual trigger for now; intended
  // future caller is scheduler-service's cron (no caller wired yet, same
  // "designed ahead of its caller" pattern as escrow-service's tick()).
  @Post(":orderId/poll-delivery")
  pollDelivery(@Param("orderId") orderId: string) {
    return this.orders.pollDeliveryStatus(orderId);
  }
}
