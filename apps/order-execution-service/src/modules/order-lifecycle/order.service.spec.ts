import { ConflictException, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { OrderService } from "./order.service";
import { McpGatewayClient } from "@gusto/mcp-client-sdk";
import { ConfirmationGateService } from "../confirmation-gate/confirmation-gate.service";
import { PrismaService } from "../../prisma/prisma.service";
import { EscrowClient } from "../../clients/escrow.client";
import { OrderPlacedPublisher } from "../../events/publishers/order-placed.publisher";
import { OrderDeliveredPublisher } from "../../events/publishers/order-delivered.publisher";
import { OrderFailedPublisher } from "../../events/publishers/order-failed.publisher";
import { OptimizedCart } from "@gusto/contracts";

function makeCart(overrides: Partial<OptimizedCart> = {}): OptimizedCart {
  return {
    items: [{ itemId: "item-1", quantity: 2 }],
    baseCost: 30000,
    fillerCost: 0,
    discountApplied: 5000,
    finalTotal: 25000,
    savingsAchieved: 5000,
    overBudget: false,
    decisionLog: [],
    ...overrides,
  };
}

function makeOrderRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "order-1",
    userId: "user-1",
    swiggyOrderRef: null,
    status: "PENDING_CONFIRMATION",
    cart: { ...makeCart(), addressId: "addr-1", restaurantId: "rest-1", paymentMethod: undefined },
    savingsAchieved: 5000,
    agentLogs: null,
    placedAt: null,
    deliveredAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("OrderService", () => {
  let mcpGateway: jest.Mocked<Pick<McpGatewayClient, "food">>;
  let confirmationGate: jest.Mocked<Pick<ConfirmationGateService, "requestConfirmation">>;
  let prisma: { order: { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock } };
  let escrow: jest.Mocked<Pick<EscrowClient, "reserve" | "capture" | "release">>;
  let orderPlacedPublisher: jest.Mocked<Pick<OrderPlacedPublisher, "publish">>;
  let orderDeliveredPublisher: jest.Mocked<Pick<OrderDeliveredPublisher, "publish">>;
  let orderFailedPublisher: jest.Mocked<Pick<OrderFailedPublisher, "publish">>;
  let service: OrderService;

  beforeEach(() => {
    mcpGateway = { food: jest.fn() };
    confirmationGate = { requestConfirmation: jest.fn().mockResolvedValue(undefined) };
    prisma = {
      order: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    };
    escrow = {
      reserve: jest.fn().mockResolvedValue(undefined),
      capture: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
    };
    orderPlacedPublisher = { publish: jest.fn().mockResolvedValue(undefined) };
    orderDeliveredPublisher = { publish: jest.fn().mockResolvedValue(undefined) };
    orderFailedPublisher = { publish: jest.fn().mockResolvedValue(undefined) };

    service = new OrderService(
      mcpGateway as unknown as McpGatewayClient,
      confirmationGate as unknown as ConfirmationGateService,
      prisma as unknown as PrismaService,
      escrow as unknown as EscrowClient,
      orderPlacedPublisher as unknown as OrderPlacedPublisher,
      orderDeliveredPublisher as unknown as OrderDeliveredPublisher,
      orderFailedPublisher as unknown as OrderFailedPublisher,
    );
  });

  describe("populateAndAwaitConfirmation", () => {
    it("reserves, creates the order, populates the Swiggy cart, and requests confirmation", async () => {
      const cart = makeCart();
      prisma.order.create.mockResolvedValue(makeOrderRow());
      mcpGateway.food.mockResolvedValue({ success: true, data: {} });

      const result = await service.populateAndAwaitConfirmation("user-1", "addr-1", "rest-1", cart, "UPI");

      expect(escrow.reserve).toHaveBeenCalledWith("user-1", 25000);
      expect(prisma.order.create).toHaveBeenCalledWith({
        data: {
          userId: "user-1",
          status: "PENDING_CONFIRMATION",
          cart: { ...cart, addressId: "addr-1", restaurantId: "rest-1", paymentMethod: "UPI" },
          savingsAchieved: 5000,
        },
      });
      expect(mcpGateway.food).toHaveBeenCalledWith(
        "update_food_cart",
        { restaurantId: "rest-1", addressId: "addr-1", cartItems: [{ itemId: "item-1", quantity: 2 }] },
        "user-1",
      );
      expect(confirmationGate.requestConfirmation).toHaveBeenCalledWith("order-1", "user-1");
      expect(result).toEqual({ orderId: "order-1", status: "PENDING_CONFIRMATION" });
    });

    it("rejects a cart at or over the ₹1000 Swiggy MCP-beta limit without reserving", async () => {
      const cart = makeCart({ finalTotal: 100000 });
      await expect(service.populateAndAwaitConfirmation("user-1", "addr-1", "rest-1", cart)).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
      expect(escrow.reserve).not.toHaveBeenCalled();
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it("propagates a reserve failure and does not create an Order row", async () => {
      const axiosErr = Object.assign(new Error("Request failed"), {
        isAxiosError: true,
        response: { status: 409, data: { message: "insufficient available balance" } },
      });
      escrow.reserve.mockRejectedValue(axiosErr);

      await expect(service.populateAndAwaitConfirmation("user-1", "addr-1", "rest-1", makeCart())).rejects.toMatchObject({
        status: 409,
      });
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it("releases the reservation and marks the order FAILED when Swiggy cart population fails", async () => {
      prisma.order.create.mockResolvedValue(makeOrderRow());
      mcpGateway.food.mockRejectedValue(new Error("update_food_cart failed"));

      await expect(
        service.populateAndAwaitConfirmation("user-1", "addr-1", "rest-1", makeCart()),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);

      expect(prisma.order.update).toHaveBeenCalledWith({ where: { id: "order-1" }, data: { status: "FAILED" } });
      expect(escrow.release).toHaveBeenCalledWith("user-1", 25000);
      expect(orderFailedPublisher.publish).toHaveBeenCalledTimes(1);
    });
  });

  describe("confirmAndPlace", () => {
    it("places the order, captures the reservation, and publishes OrderPlaced on success", async () => {
      prisma.order.findUnique.mockResolvedValue(makeOrderRow());
      prisma.order.update.mockResolvedValue(makeOrderRow({ status: "PLACED", swiggyOrderRef: "swiggy-order-1" }));
      mcpGateway.food.mockResolvedValue({ success: true, data: { orderId: "swiggy-order-1" } });

      const result = await service.confirmAndPlace("order-1");

      expect(mcpGateway.food).toHaveBeenCalledWith("place_food_order", { addressId: "addr-1" }, "user-1");
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: "order-1" },
        data: { status: "PLACED", swiggyOrderRef: "swiggy-order-1", placedAt: expect.any(Date) },
      });
      expect(escrow.capture).toHaveBeenCalledWith("user-1", 25000);
      expect(orderPlacedPublisher.publish).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ orderId: "order-1", status: "PLACED", swiggyOrderRef: "swiggy-order-1" });
    });

    it("404s for an unknown order", async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      await expect(service.confirmAndPlace("ghost")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("409s (idempotency guard) when the order isn't PENDING_CONFIRMATION", async () => {
      prisma.order.findUnique.mockResolvedValue(makeOrderRow({ status: "PLACED" }));
      await expect(service.confirmAndPlace("order-1")).rejects.toBeInstanceOf(ConflictException);
      expect(mcpGateway.food).not.toHaveBeenCalled();
    });

    it("releases the reservation and marks FAILED on a clean domain failure (success:false)", async () => {
      prisma.order.findUnique.mockResolvedValue(makeOrderRow());
      mcpGateway.food.mockResolvedValue({ success: false, error: { message: "restaurant closed" } });

      await expect(service.confirmAndPlace("order-1")).rejects.toBeInstanceOf(UnprocessableEntityException);

      expect(prisma.order.update).toHaveBeenCalledWith({ where: { id: "order-1" }, data: { status: "FAILED" } });
      expect(escrow.release).toHaveBeenCalledWith("user-1", 25000);
      expect(orderFailedPublisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({ orderId: "order-1", reason: "restaurant closed" }),
      );
    });

    it("fails closed on an ambiguous failure (network/5xx) without retrying place_food_order", async () => {
      prisma.order.findUnique.mockResolvedValue(makeOrderRow());
      mcpGateway.food
        .mockRejectedValueOnce(new Error("ECONNRESET")) // place_food_order
        .mockResolvedValueOnce({ success: true, data: { orders: [] } }); // get_food_orders reconciliation

      await expect(service.confirmAndPlace("order-1")).rejects.toBeInstanceOf(UnprocessableEntityException);

      expect(mcpGateway.food).toHaveBeenCalledTimes(2);
      expect(mcpGateway.food).toHaveBeenNthCalledWith(2, "get_food_orders", { addressId: "addr-1" }, "user-1");
      expect(escrow.release).toHaveBeenCalledWith("user-1", 25000);
      expect(escrow.capture).not.toHaveBeenCalled();
    });

    it("still fails closed even if the reconciliation call itself fails", async () => {
      prisma.order.findUnique.mockResolvedValue(makeOrderRow());
      mcpGateway.food.mockRejectedValue(new Error("gateway unreachable"));

      await expect(service.confirmAndPlace("order-1")).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(escrow.release).toHaveBeenCalledWith("user-1", 25000);
    });
  });

  describe("getStatus", () => {
    it("returns the order status", async () => {
      prisma.order.findUnique.mockResolvedValue(makeOrderRow({ status: "PLACED", swiggyOrderRef: "swiggy-1" }));
      const result = await service.getStatus("order-1");
      expect(result).toMatchObject({ orderId: "order-1", status: "PLACED", swiggyOrderRef: "swiggy-1" });
    });

    it("404s for an unknown order", async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      await expect(service.getStatus("ghost")).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("pollDeliveryStatus", () => {
    it("marks the order DELIVERED and publishes OrderDelivered when Swiggy reports delivered", async () => {
      prisma.order.findUnique.mockResolvedValue(makeOrderRow({ status: "PLACED", swiggyOrderRef: "swiggy-1" }));
      prisma.order.update.mockResolvedValue(makeOrderRow({ status: "DELIVERED", swiggyOrderRef: "swiggy-1" }));
      mcpGateway.food.mockResolvedValue({ success: true, data: { status: "Delivered" } });

      const result = await service.pollDeliveryStatus("order-1");

      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: "order-1" },
        data: { status: "DELIVERED", deliveredAt: expect.any(Date) },
      });
      expect(orderDeliveredPublisher.publish).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ orderId: "order-1", status: "DELIVERED" });
    });

    it("is a no-op when Swiggy has not marked the order delivered yet", async () => {
      prisma.order.findUnique.mockResolvedValue(makeOrderRow({ status: "PLACED", swiggyOrderRef: "swiggy-1" }));
      mcpGateway.food.mockResolvedValue({ success: true, data: { status: "Out for delivery" } });

      const result = await service.pollDeliveryStatus("order-1");

      expect(prisma.order.update).not.toHaveBeenCalled();
      expect(orderDeliveredPublisher.publish).not.toHaveBeenCalled();
      expect(result).toMatchObject({ orderId: "order-1", status: "PLACED" });
    });

    it("409s when the order has no swiggyOrderRef yet", async () => {
      prisma.order.findUnique.mockResolvedValue(makeOrderRow({ swiggyOrderRef: null }));
      await expect(service.pollDeliveryStatus("order-1")).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
