import { ConflictException, NotFoundException } from "@nestjs/common";
import { WorkflowService } from "./workflow.service";
import { WorkflowStateMachine } from "./workflow.state-machine";
import { PrismaService } from "../../prisma/prisma.service";
import { AiAgentClient } from "../../clients/ai-agent.client";
import { CouponOptimizationClient } from "../../clients/coupon-optimization.client";
import { OrderExecutionClient } from "../../clients/order-execution.client";
import { NotificationClient } from "../../clients/notification.client";
import { EscrowClient } from "../../clients/escrow.client";
import { AuthClient } from "../../clients/auth.client";
import { McpGatewayClient } from "@gusto/mcp-client-sdk";
import { ScoutCompletedPublisher } from "../../events/publishers/scout-completed.publisher";
import { MenuProposedPublisher } from "../../events/publishers/menu-proposed.publisher";
import { MealApprovedPublisher } from "../../events/publishers/meal-approved.publisher";
import { MealSkippedPublisher } from "../../events/publishers/meal-skipped.publisher";

const MENU_ITEMS = [
  { itemId: "item-1", restaurantId: "rest-1", name: "Paneer Roll", price: 15000 },
  { itemId: "item-2", restaurantId: "rest-1", name: "Veg Biryani", price: 20000 },
];

// get_restaurant_menu's real response shape (KNOWN_ISSUES.md item 30):
// category-paginated, items keyed `id` not `itemId` -- matches what
// fetchMenu() actually parses (maps id -> itemId, injects restaurantId).
const MENU_RESPONSE = {
  categories: [{ items: MENU_ITEMS.map((i) => ({ id: i.itemId, name: i.name, price: i.price })) }],
};

const SUBSCRIPTION = {
  userId: "user-1",
  totalDeposited: 350000,
  currentBalance: 245006,
  reservedAmount: 0,
  daysLeft: 21,
  dailyAvgLimit: 11666,
};

const OPTIMIZED_CART = {
  items: [{ itemId: "item-2", quantity: 1 }],
  baseCost: 20000,
  fillerCost: 0,
  discountApplied: 0,
  finalTotal: 20000,
  savingsAchieved: 0,
  overBudget: false,
  decisionLog: [],
};

function makeRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "row-1",
    userId: "user-1",
    cycleDate: new Date(),
    phase: "SCOUTING",
    addressId: "addr-1",
    restaurantId: "rest-1",
    shortlist: null,
    optimizedCart: null,
    rejectedItemIds: [],
    decision: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("WorkflowService", () => {
  let prisma: { workflowState: { findUnique: jest.Mock; upsert: jest.Mock; update: jest.Mock } };
  let aiAgent: jest.Mocked<Pick<AiAgentClient, "analyze">>;
  let couponOptimization: jest.Mocked<Pick<CouponOptimizationClient, "optimizeCart">>;
  let orderExecution: jest.Mocked<Pick<OrderExecutionClient, "executeOrder">>;
  let notification: jest.Mocked<Pick<NotificationClient, "sendMenuOfTheDay">>;
  let escrow: jest.Mocked<Pick<EscrowClient, "getSubscription" | "rollover">>;
  let auth: jest.Mocked<Pick<AuthClient, "getPreferenceProfile">>;
  let mcpGateway: jest.Mocked<Pick<McpGatewayClient, "food">>;
  let scoutCompletedPublisher: jest.Mocked<Pick<ScoutCompletedPublisher, "publish">>;
  let menuProposedPublisher: jest.Mocked<Pick<MenuProposedPublisher, "publish">>;
  let mealApprovedPublisher: jest.Mocked<Pick<MealApprovedPublisher, "publish">>;
  let mealSkippedPublisher: jest.Mocked<Pick<MealSkippedPublisher, "publish">>;
  let service: WorkflowService;

  beforeEach(() => {
    prisma = {
      workflowState: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
    };
    aiAgent = { analyze: jest.fn() };
    couponOptimization = { optimizeCart: jest.fn() };
    orderExecution = { executeOrder: jest.fn() };
    notification = { sendMenuOfTheDay: jest.fn().mockResolvedValue(undefined) };
    escrow = { getSubscription: jest.fn(), rollover: jest.fn().mockResolvedValue(undefined) };
    auth = { getPreferenceProfile: jest.fn() };
    mcpGateway = { food: jest.fn() };
    scoutCompletedPublisher = { publish: jest.fn().mockResolvedValue(undefined) };
    menuProposedPublisher = { publish: jest.fn().mockResolvedValue(undefined) };
    mealApprovedPublisher = { publish: jest.fn().mockResolvedValue(undefined) };
    mealSkippedPublisher = { publish: jest.fn().mockResolvedValue(undefined) };

    service = new WorkflowService(
      aiAgent as unknown as AiAgentClient,
      couponOptimization as unknown as CouponOptimizationClient,
      orderExecution as unknown as OrderExecutionClient,
      notification as unknown as NotificationClient,
      escrow as unknown as EscrowClient,
      auth as unknown as AuthClient,
      mcpGateway as unknown as McpGatewayClient,
      new WorkflowStateMachine(),
      prisma as unknown as PrismaService,
      scoutCompletedPublisher as unknown as ScoutCompletedPublisher,
      menuProposedPublisher as unknown as MenuProposedPublisher,
      mealApprovedPublisher as unknown as MealApprovedPublisher,
      mealSkippedPublisher as unknown as MealSkippedPublisher,
    );

    mcpGateway.food.mockResolvedValue({ success: true, data: MENU_RESPONSE });
    escrow.getSubscription.mockResolvedValue(SUBSCRIPTION);
    auth.getPreferenceProfile.mockResolvedValue({ userId: "user-1", prefProfile: { diet: "veg", spiceLevel: 3, cuisineFavorites: [] } });
    aiAgent.analyze.mockResolvedValue({
      rankedItems: [
        { itemId: "item-2", semanticTags: [], matchScore: 0.9 },
        { itemId: "item-1", semanticTags: [], matchScore: 0.5 },
      ],
    });
    couponOptimization.optimizeCart.mockResolvedValue(OPTIMIZED_CART);
  });

  describe("runScoutPhase", () => {
    it("runs the full Scout -> Hacker flow and lands in AWAITING_APPROVAL", async () => {
      prisma.workflowState.findUnique.mockResolvedValue(null);
      prisma.workflowState.upsert.mockResolvedValue(makeRow());
      prisma.workflowState.update.mockResolvedValue(makeRow({ phase: "AWAITING_APPROVAL" }));

      const result = await service.runScoutPhase("user-1", "addr-1", "rest-1");

      expect(result.phase).toEqual("AWAITING_APPROVAL");
      expect(couponOptimization.optimizeCart).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user-1", restaurantId: "rest-1", addressId: "addr-1" }),
      );
      expect(scoutCompletedPublisher.publish).toHaveBeenCalledWith(expect.objectContaining({ userId: "user-1" }));
      expect(menuProposedPublisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user-1", proposedItems: expect.any(Array) }),
      );
      expect(notification.sendMenuOfTheDay).toHaveBeenCalledWith("user-1", OPTIMIZED_CART);
    });

    it("rejects a second scout run the same day (already past SCOUTING)", async () => {
      prisma.workflowState.findUnique.mockResolvedValue(makeRow({ phase: "AWAITING_APPROVAL" }));

      await expect(service.runScoutPhase("user-1", "addr-1", "rest-1")).rejects.toThrow(ConflictException);
      expect(prisma.workflowState.upsert).not.toHaveBeenCalled();
    });

    it("does not fail the request when a publish call fails", async () => {
      prisma.workflowState.findUnique.mockResolvedValue(null);
      prisma.workflowState.upsert.mockResolvedValue(makeRow());
      prisma.workflowState.update.mockResolvedValue(makeRow({ phase: "AWAITING_APPROVAL" }));
      scoutCompletedPublisher.publish.mockRejectedValue(new Error("bus down"));

      await expect(service.runScoutPhase("user-1", "addr-1", "rest-1")).resolves.toBeDefined();
    });
  });

  describe("handleUserDecision", () => {
    const shortlist = {
      rankedItems: [
        { itemId: "item-2", semanticTags: [], matchScore: 0.9 },
        { itemId: "item-1", semanticTags: [], matchScore: 0.5 },
      ],
      currentItem: MENU_ITEMS[1],
    };

    it("throws NotFoundException when there is no workflow state for today", async () => {
      prisma.workflowState.findUnique.mockResolvedValue(null);
      await expect(service.handleUserDecision("user-1", "APPROVE")).rejects.toThrow(NotFoundException);
    });

    it("throws ConflictException when the workflow is not awaiting approval", async () => {
      prisma.workflowState.findUnique.mockResolvedValue(makeRow({ phase: "SCOUTING" }));
      await expect(service.handleUserDecision("user-1", "APPROVE")).rejects.toThrow(ConflictException);
    });

    it("APPROVE: executes the order and transitions to EXECUTING", async () => {
      prisma.workflowState.findUnique.mockResolvedValue(
        makeRow({ phase: "AWAITING_APPROVAL", shortlist, optimizedCart: OPTIMIZED_CART }),
      );
      prisma.workflowState.update
        .mockResolvedValueOnce(makeRow({ phase: "APPROVED" }))
        .mockResolvedValueOnce(makeRow({ phase: "EXECUTING" }));
      orderExecution.executeOrder.mockResolvedValue({ orderId: "order-1", status: "PENDING_CONFIRMATION" });

      const result = await service.handleUserDecision("user-1", "APPROVE");

      expect(orderExecution.executeOrder).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user-1", addressId: "addr-1", restaurantId: "rest-1" }),
      );
      expect(result.phase).toEqual("EXECUTING");
      expect(mealApprovedPublisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user-1", itemId: "item-2" }),
      );
    });

    it("SKIP: rolls over the budget and transitions to SKIPPED", async () => {
      prisma.workflowState.findUnique.mockResolvedValue(
        makeRow({ phase: "AWAITING_APPROVAL", shortlist, optimizedCart: OPTIMIZED_CART }),
      );
      prisma.workflowState.update.mockResolvedValue(makeRow({ phase: "SKIPPED" }));

      const result = await service.handleUserDecision("user-1", "SKIP");

      expect(escrow.rollover).toHaveBeenCalledWith("user-1");
      expect(result.phase).toEqual("SKIPPED");
      expect(mealSkippedPublisher.publish).toHaveBeenCalledWith(expect.objectContaining({ userId: "user-1" }));
    });

    it("SWAP: re-proposes the next-ranked item and stays in AWAITING_APPROVAL", async () => {
      prisma.workflowState.findUnique.mockResolvedValue(
        makeRow({ phase: "AWAITING_APPROVAL", shortlist, optimizedCart: OPTIMIZED_CART, rejectedItemIds: [] }),
      );
      prisma.workflowState.update.mockResolvedValue(makeRow({ phase: "AWAITING_APPROVAL" }));

      const result = await service.handleUserDecision("user-1", "SWAP");

      expect(result.phase).toEqual("AWAITING_APPROVAL");
      expect(prisma.workflowState.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ rejectedItemIds: ["item-2"] }) }),
      );
    });

    it("SWAP: falls back to SKIP when every ranked item has been rejected", async () => {
      prisma.workflowState.findUnique.mockResolvedValue(
        makeRow({
          phase: "AWAITING_APPROVAL",
          shortlist: { rankedItems: [{ itemId: "item-2", semanticTags: [], matchScore: 0.9 }], currentItem: MENU_ITEMS[1] },
          optimizedCart: OPTIMIZED_CART,
          rejectedItemIds: ["item-1"],
        }),
      );
      prisma.workflowState.update.mockResolvedValue(makeRow({ phase: "SKIPPED" }));

      const result = await service.handleUserDecision("user-1", "SWAP");

      expect(result.phase).toEqual("SKIPPED");
      expect(escrow.rollover).toHaveBeenCalledWith("user-1");
    });
  });

  describe("sendReminderIfPending", () => {
    it("re-sends the menu notification when still AWAITING_APPROVAL", async () => {
      prisma.workflowState.findUnique.mockResolvedValue(
        makeRow({ phase: "AWAITING_APPROVAL", optimizedCart: OPTIMIZED_CART }),
      );

      const result = await service.sendReminderIfPending("user-1");

      expect(result).toEqual({ userId: "user-1", sent: true });
      expect(notification.sendMenuOfTheDay).toHaveBeenCalledWith("user-1", OPTIMIZED_CART);
    });

    it("no-ops when already decided", async () => {
      prisma.workflowState.findUnique.mockResolvedValue(makeRow({ phase: "SKIPPED" }));

      const result = await service.sendReminderIfPending("user-1");

      expect(result).toEqual({ userId: "user-1", sent: false });
      expect(notification.sendMenuOfTheDay).not.toHaveBeenCalled();
    });

    it("no-ops when no workflow ran today", async () => {
      prisma.workflowState.findUnique.mockResolvedValue(null);

      const result = await service.sendReminderIfPending("user-1");

      expect(result).toEqual({ userId: "user-1", sent: false });
    });
  });

  describe("finalizeIfPending", () => {
    const shortlist = {
      rankedItems: [{ itemId: "item-2", semanticTags: [], matchScore: 0.9 }],
      currentItem: MENU_ITEMS[1],
    };

    it("auto-transitions to SKIPPED (never auto-APPROVE) when still AWAITING_APPROVAL", async () => {
      prisma.workflowState.findUnique.mockResolvedValue(
        makeRow({ phase: "AWAITING_APPROVAL", shortlist, optimizedCart: OPTIMIZED_CART }),
      );
      prisma.workflowState.update.mockResolvedValue(makeRow({ phase: "SKIPPED" }));

      const result = await service.finalizeIfPending("user-1");

      expect(result).toEqual({ userId: "user-1", finalized: true, phase: "SKIPPED" });
      expect(escrow.rollover).toHaveBeenCalledWith("user-1");
      expect(orderExecution.executeOrder).not.toHaveBeenCalled();
    });

    it("no-ops when already decided", async () => {
      prisma.workflowState.findUnique.mockResolvedValue(makeRow({ phase: "EXECUTING" }));

      const result = await service.finalizeIfPending("user-1");

      expect(result).toEqual({ userId: "user-1", finalized: false });
      expect(escrow.rollover).not.toHaveBeenCalled();
    });

    it("no-ops when no workflow ran today", async () => {
      prisma.workflowState.findUnique.mockResolvedValue(null);

      const result = await service.finalizeIfPending("user-1");

      expect(result).toEqual({ userId: "user-1", finalized: false });
    });
  });
});
