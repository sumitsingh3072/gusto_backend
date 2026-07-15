import { Injectable, NotFoundException } from "@nestjs/common";
import { createLogger } from "@gusto/logger";
import { NotificationClient } from "../../clients/notification.client";
import { PrismaService } from "../../prisma/prisma.service";

const logger = createLogger("order-execution-service:confirmation-gate");

/**
 * Human-in-the-loop guardrail: Gusto NEVER places an order without a
 * biometric/PIN confirmation from the user, requested via notification-service.
 * The signal that confirmation was received is `POST /orders/confirm` itself
 * (see OrderController) -- there is no separate polling loop.
 */
@Injectable()
export class ConfirmationGateService {
  constructor(
    private readonly notification: NotificationClient,
    private readonly prisma: PrismaService,
  ) {}

  async requestConfirmation(orderId: string, userId: string) {
    // Fire-and-forget: notification-service has no inbound listener for
    // this yet (same "publisher without consumer" pattern already
    // normalized in this repo) -- a notification failure must not block
    // order flow, only be logged.
    try {
      await this.notification.requestConfirmation(userId, orderId);
    } catch (err) {
      logger.warn({ orderId, userId, err }, "failed to request confirmation notification");
    }
  }

  async isConfirmed(orderId: string): Promise<boolean> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`no order ${orderId}`);
    return order.status !== "PENDING_CONFIRMATION";
  }
}
