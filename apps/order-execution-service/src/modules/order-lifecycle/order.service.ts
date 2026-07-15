import {
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import axios from "axios";
import { McpGatewayClient } from "@gusto/mcp-client-sdk";
import { OptimizedCart } from "@gusto/contracts";
import { createLogger } from "@gusto/logger";
import { ConfirmationGateService } from "../confirmation-gate/confirmation-gate.service";
import { PrismaService } from "../../prisma/prisma.service";
import { EscrowClient } from "../../clients/escrow.client";
import { OrderPlacedPublisher } from "../../events/publishers/order-placed.publisher";
import { OrderDeliveredPublisher } from "../../events/publishers/order-delivered.publisher";
import { OrderFailedPublisher } from "../../events/publishers/order-failed.publisher";
import type { Order } from "../../../prisma/generated/client";

const logger = createLogger("order-execution-service:order-service");

// Swiggy's MCP beta blocks order placement for cart totals >= ₹1000 (see
// .agents/rules/swiggy_place_food_order.md) -- reject early with a clear
// error instead of a confusing Swiggy-side rejection after money is reserved.
const MAX_ORDER_TOTAL_PAISE = 100000;

// The `cart` JSON column stores OptimizedCart plus the extra fields Swiggy's
// tools need but OptimizedCartSchema doesn't carry (addressId/restaurantId/
// paymentMethod) -- see order-execution-service-developer-docs.md design
// decision #2. This is how confirmAndPlace() later recovers them.
type StoredOrderCart = OptimizedCart & {
  addressId: string;
  restaurantId: string;
  paymentMethod?: string;
};

function toOptimizedCart(storedCart: StoredOrderCart): OptimizedCart {
  const { items, baseCost, fillerCost, discountApplied, finalTotal, savingsAchieved, couponCode, overBudget, decisionLog } = storedCart;
  return { items, baseCost, fillerCost, discountApplied, finalTotal, savingsAchieved, couponCode, overBudget, decisionLog };
}

function describeError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return `HTTP ${err.response?.status ?? "?"}: ${JSON.stringify(err.response?.data ?? err.message)}`;
  }
  return err instanceof Error ? err.message : String(err);
}

// Upstream error mapping per CLAUDE.md convention: upstream error response
// -> rethrow with the same status; upstream unreachable -> 503. Never leak
// raw axios errors/stack traces to a client.
function mapUpstreamError(err: unknown): never {
  if (axios.isAxiosError(err)) {
    if (err.response) {
      const message = (err.response.data as { message?: string } | undefined)?.message ?? err.message;
      throw new HttpException(message, err.response.status);
    }
    throw new ServiceUnavailableException(`upstream unreachable: ${err.message}`);
  }
  throw new ServiceUnavailableException(err instanceof Error ? err.message : "unknown upstream error");
}

/**
 * Owns the `orders` table exclusively. Never places an order without a
 * confirmed human-in-the-loop gate (ConfirmationGateService) -- this is a
 * hard guardrail, not a UX nicety.
 */
@Injectable()
export class OrderService {
  constructor(
    private readonly mcpGateway: McpGatewayClient,
    private readonly confirmationGate: ConfirmationGateService,
    private readonly prisma: PrismaService,
    private readonly escrow: EscrowClient,
    private readonly orderPlacedPublisher: OrderPlacedPublisher,
    private readonly orderDeliveredPublisher: OrderDeliveredPublisher,
    private readonly orderFailedPublisher: OrderFailedPublisher,
  ) {}

  async populateAndAwaitConfirmation(
    userId: string,
    addressId: string,
    restaurantId: string,
    cart: OptimizedCart,
    paymentMethod?: string,
  ) {
    if (cart.finalTotal >= MAX_ORDER_TOTAL_PAISE) {
      throw new UnprocessableEntityException(
        `cart total ${cart.finalTotal} paise meets/exceeds Swiggy's ₹1000 MCP-beta order limit`,
      );
    }

    try {
      await this.escrow.reserve(userId, cart.finalTotal);
    } catch (err) {
      mapUpstreamError(err);
    }

    const storedCart: StoredOrderCart = { ...cart, addressId, restaurantId, paymentMethod };
    const order = await this.prisma.order.create({
      data: {
        userId,
        status: "PENDING_CONFIRMATION",
        cart: storedCart as object,
        savingsAchieved: cart.savingsAchieved,
      },
    });

    try {
      // "Populate" = replicate our OptimizedCart onto Swiggy's actual
      // server-side cart, per the documented confirmation protocol (must
      // inspect the live cart before place_food_order).
      await this.mcpGateway.food(
        "update_food_cart",
        {
          restaurantId,
          addressId,
          // OptimizedCartSchema.items has no variant/variantsV2 data --
          // best-effort replication, documented known gap.
          cartItems: cart.items.map((i) => ({ itemId: i.itemId, quantity: i.quantity })),
        },
        userId,
      );

      if (cart.couponCode) {
        await this.mcpGateway.food("apply_food_coupon", { couponCode: cart.couponCode, addressId }, userId);
      }

      const cartCheck = await this.mcpGateway.food<{ availablePaymentMethods?: string[] }>(
        "get_food_cart",
        { addressId },
        userId,
      );
      if (
        paymentMethod &&
        cartCheck.data?.availablePaymentMethods &&
        !cartCheck.data.availablePaymentMethods.includes(paymentMethod)
      ) {
        logger.warn(
          { orderId: order.id, paymentMethod },
          "requested paymentMethod not in availablePaymentMethods; Swiggy will auto-default",
        );
      }
    } catch (err) {
      await this.markFailed(order, storedCart, `failed to populate Swiggy cart: ${describeError(err)}`);
    }

    try {
      await this.confirmationGate.requestConfirmation(order.id, userId);
    } catch (err) {
      logger.warn({ orderId: order.id, err }, "requestConfirmation failed; order still awaits manual confirmation");
    }

    return { orderId: order.id, status: "PENDING_CONFIRMATION" as const };
  }

  async confirmAndPlace(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`no order ${orderId}`);
    if (order.status !== "PENDING_CONFIRMATION") {
      throw new ConflictException(`order ${orderId} is not awaiting confirmation (status=${order.status})`);
    }

    const storedCart = order.cart as unknown as StoredOrderCart;
    const { addressId, paymentMethod } = storedCart;

    let result;
    try {
      result = await this.mcpGateway.food<{ orderId?: string; order_id?: string }>(
        "place_food_order",
        { addressId, ...(paymentMethod ? { paymentMethod } : {}) },
        order.userId,
      );
    } catch (err) {
      // Ambiguous failure (network/5xx/timeout) -- place_food_order is
      // non-idempotent and the gateway will NOT retry it. Never retry here
      // either; reconcile once, best-effort, then fail closed.
      return this.reconcileAmbiguousFailure(order, storedCart, describeError(err));
    }

    if (result.success) {
      const swiggyOrderRef = result.data?.orderId ?? result.data?.order_id ?? randomUUID();
      return this.markPlaced(order, storedCart, swiggyOrderRef);
    }

    // Clean domain failure (success:false) -- non-retryable per Swiggy's
    // error-code classification (e.g. restaurant closed, item unavailable).
    return this.markFailed(
      order,
      storedCart,
      result.error?.message ?? result.message ?? "place_food_order rejected",
    );
  }

  async getStatus(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`no order ${orderId}`);
    return {
      orderId: order.id,
      status: order.status,
      swiggyOrderRef: order.swiggyOrderRef,
      placedAt: order.placedAt,
      deliveredAt: order.deliveredAt,
    };
  }

  // No caller wired yet -- intended for a future scheduler-service cron,
  // same "designed ahead of its caller" pattern as escrow-service's tick().
  // Exposed via POST /orders/:orderId/poll-delivery for manual/smoke testing.
  async pollDeliveryStatus(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`no order ${orderId}`);
    if (!order.swiggyOrderRef) {
      throw new ConflictException(`order ${orderId} has no swiggyOrderRef yet (status=${order.status})`);
    }

    const tracked = await this.mcpGateway.food<{ status?: string }>(
      "track_food_order",
      { orderId: order.swiggyOrderRef },
      order.userId,
    );
    const swiggyStatus = tracked.data?.status;
    if (swiggyStatus && swiggyStatus.toUpperCase() === "DELIVERED") {
      const updated = await this.prisma.order.update({
        where: { id: order.id },
        data: { status: "DELIVERED", deliveredAt: new Date() },
      });
      await this.orderDeliveredPublisher.publish({
        eventId: randomUUID(),
        occurredAt: new Date().toISOString(),
        userId: order.userId,
        orderId: order.id,
      });
      return { orderId: order.id, status: updated.status };
    }
    return { orderId: order.id, status: order.status, swiggyStatus };
  }

  private async markPlaced(order: Order, storedCart: StoredOrderCart, swiggyOrderRef: string) {
    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: { status: "PLACED", swiggyOrderRef, placedAt: new Date() },
    });

    try {
      await this.escrow.capture(order.userId, storedCart.finalTotal);
    } catch (err) {
      // The Swiggy order already exists at this point -- we cannot undo it.
      // A failed capture leaves the reservation stuck (known limitation,
      // no saga/compensation mechanism built in this pass); log loudly for
      // manual reconciliation rather than throwing and hiding the fact the
      // order itself succeeded.
      logger.error({ orderId: order.id, err }, "order placed but escrow capture failed; reservation stuck, needs manual reconciliation");
    }

    await this.orderPlacedPublisher.publish({
      eventId: randomUUID(),
      occurredAt: new Date().toISOString(),
      userId: order.userId,
      orderId: order.id,
      cart: toOptimizedCart(storedCart),
    });

    return { orderId: order.id, status: updated.status, swiggyOrderRef };
  }

  private async markFailed(order: Order, storedCart: StoredOrderCart, reason: string): Promise<never> {
    await this.prisma.order.update({ where: { id: order.id }, data: { status: "FAILED" } });

    try {
      await this.escrow.release(order.userId, storedCart.finalTotal);
    } catch (err) {
      logger.error({ orderId: order.id, err }, "order failed but escrow release also failed; reservation stuck, needs manual reconciliation");
    }

    await this.orderFailedPublisher.publish({
      eventId: randomUUID(),
      occurredAt: new Date().toISOString(),
      userId: order.userId,
      orderId: order.id,
      reason,
    });

    throw new UnprocessableEntityException(reason);
  }

  // Fail-closed by design: Swiggy has no idempotency key today, so there is
  // no reliable way to confirm a `get_food_orders` result actually
  // corresponds to THIS attempt. Guessing "placed" risks capturing funds for
  // an order that was never actually ours -- the exact loss scenario the
  // reserve/capture/release design exists to prevent. Always resolves to
  // FAILED + release, with full reconciliation context logged for manual
  // investigation. Documented known limitation, not a full solution.
  private async reconcileAmbiguousFailure(order: Order, storedCart: StoredOrderCart, reason: string) {
    let reconciliationNote: string;
    try {
      const orders = await this.mcpGateway.food("get_food_orders", { addressId: storedCart.addressId }, order.userId);
      reconciliationNote = `get_food_orders returned: ${JSON.stringify(orders.data)}`;
    } catch (err) {
      reconciliationNote = `get_food_orders reconciliation call itself failed: ${describeError(err)}`;
    }
    logger.warn(
      { orderId: order.id, reason, reconciliationNote },
      "ambiguous place_food_order failure -- failing closed (releasing reservation); manual investigation required to confirm whether Swiggy actually placed this order",
    );
    return this.markFailed(
      order,
      storedCart,
      `ambiguous place_food_order failure: ${reason}. ${reconciliationNote}`,
    );
  }
}
