import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { OrderService } from "./order.service";

@Controller("orders")
export class OrderController {
  constructor(private readonly orders: OrderService) {}

  // POST /orders/execute -- called by orchestrator-service after approval
  @Post("execute")
  execute(@Body() body: { cart: unknown; userId: string }) {
    return this.orders.populateAndAwaitConfirmation(body.cart, body.userId);
  }

  // POST /orders/confirm -- biometric/PIN confirmation received
  @Post("confirm")
  confirm(@Body() body: { orderId: string }) {
    return this.orders.confirmAndPlace(body.orderId);
  }

  // GET /orders/:orderId/status
  @Get(":orderId/status")
  status(@Param("orderId") orderId: string) {
    return this.orders.getStatus(orderId);
  }
}
