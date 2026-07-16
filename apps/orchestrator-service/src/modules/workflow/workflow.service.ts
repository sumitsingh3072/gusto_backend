import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { McpGatewayClient } from "@gusto/mcp-client-sdk";
import { createLogger } from "@gusto/logger";
import { MenuItem, MenuItemSchema, OptimizedCart, PreferenceProfileSchema, RankedMenuItem } from "@gusto/contracts";
import { AiAgentClient } from "../../clients/ai-agent.client";
import { CouponOptimizationClient } from "../../clients/coupon-optimization.client";
import { OrderExecutionClient } from "../../clients/order-execution.client";
import { NotificationClient } from "../../clients/notification.client";
import { EscrowClient } from "../../clients/escrow.client";
import { AuthClient } from "../../clients/auth.client";
import { mapUpstreamError } from "../../clients/map-upstream-error";
import { WorkflowStateMachine } from "./workflow.state-machine";
import { PrismaService } from "../../prisma/prisma.service";
import { ScoutCompletedPublisher } from "../../events/publishers/scout-completed.publisher";
import { MenuProposedPublisher } from "../../events/publishers/menu-proposed.publisher";
import { MealApprovedPublisher } from "../../events/publishers/meal-approved.publisher";
import { MealSkippedPublisher } from "../../events/publishers/meal-skipped.publisher";

const logger = createLogger("orchestrator-service:workflow-service");

interface ShortlistState {
  rankedItems: RankedMenuItem[];
  currentItem: MenuItem;
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Coordinates the daily meal lifecycle. Owns workflow_state. Is the ONLY
 * service in the whole system permitted to call AiAgentClient -- it never
 * calls Swiggy directly (that goes through McpGatewayClient), never computes
 * coupon math itself (delegates to CouponOptimizationClient), and never
 * touches payment or the balance directly (delegates to EscrowClient /
 * OrderExecutionClient).
 */
@Injectable()
export class WorkflowService {
  constructor(
    private readonly aiAgent: AiAgentClient,
    private readonly couponOptimization: CouponOptimizationClient,
    private readonly orderExecution: OrderExecutionClient,
    private readonly notification: NotificationClient,
    private readonly escrow: EscrowClient,
    private readonly auth: AuthClient,
    private readonly mcpGateway: McpGatewayClient,
    private readonly stateMachine: WorkflowStateMachine,
    private readonly prisma: PrismaService,
    private readonly scoutCompletedPublisher: ScoutCompletedPublisher,
    private readonly menuProposedPublisher: MenuProposedPublisher,
    private readonly mealApprovedPublisher: MealApprovedPublisher,
    private readonly mealSkippedPublisher: MealSkippedPublisher,
  ) {}

  async runScoutPhase(userId: string, addressId: string, restaurantId: string) {
    const cycleDate = startOfUtcDay(new Date());

    const existing = await this.prisma.workflowState.findUnique({ where: { userId_cycleDate: { userId, cycleDate } } });
    if (existing && existing.phase !== "SCOUTING") {
      throw new ConflictException(`workflow already scouted for userId ${userId} today (phase: ${existing.phase})`);
    }

    const row = await this.prisma.workflowState.upsert({
      where: { userId_cycleDate: { userId, cycleDate } },
      create: { userId, cycleDate, phase: "SCOUTING", addressId, restaurantId },
      update: { addressId, restaurantId },
    });

    if (!this.stateMachine.canTransition("SCOUTING", "OPTIMIZING")) {
      throw new ConflictException("SCOUTING -> OPTIMIZING transition is not permitted");
    }

    const [subscription, profile, menuItems] = await Promise.all([
      this.escrow.getSubscription(userId),
      this.auth.getPreferenceProfile(userId),
      this.fetchMenu(userId, restaurantId),
    ]);

    const weeklyBudget = {
      totalAmount: subscription.totalDeposited,
      spentSoFar: subscription.totalDeposited - subscription.currentBalance,
      mealsRemaining: Math.max(1, Math.floor(subscription.currentBalance / (subscription.dailyAvgLimit || 1))),
      dailyAvgLimit: subscription.dailyAvgLimit,
    };

    const { rankedItems } = await this.aiAgent.analyze({
      preferenceProfile: this.parsePreferenceProfile(userId, profile.prefProfile),
      menuItems,
      weeklyBudget,
    });

    const proposal = this.selectNextCandidate(menuItems, rankedItems, []);
    if (!proposal) {
      throw new ConflictException(`no eligible menu items to propose for userId ${userId}`);
    }

    if (!this.stateMachine.canTransition("OPTIMIZING", "AWAITING_APPROVAL")) {
      throw new ConflictException("OPTIMIZING -> AWAITING_APPROVAL transition is not permitted");
    }

    const optimizedCart = await this.couponOptimization.optimizeCart({
      userId,
      restaurantId,
      addressId,
      cartItems: [{ itemId: proposal.itemId, price: proposal.price, quantity: 1 }],
      remainingDailyBudget: weeklyBudget.dailyAvgLimit,
    });

    const shortlist: ShortlistState = { rankedItems, currentItem: proposal };

    const updated = await this.prisma.workflowState.update({
      where: { id: row.id },
      data: {
        phase: "AWAITING_APPROVAL",
        shortlist: shortlist as object,
        optimizedCart: optimizedCart as object,
        rejectedItemIds: [],
      },
    });

    await this.publishScoutCompletedAndMenuProposed(userId, menuItems, optimizedCart);
    await this.dispatchMenuNotification(userId, optimizedCart);

    return { userId, phase: updated.phase, optimizedCart };
  }

  async handleUserDecision(userId: string, decision: "APPROVE" | "SWAP" | "SKIP") {
    const cycleDate = startOfUtcDay(new Date());
    const row = await this.prisma.workflowState.findUnique({ where: { userId_cycleDate: { userId, cycleDate } } });

    if (!row) {
      throw new NotFoundException(`no workflow state for userId ${userId} today`);
    }
    if (row.phase !== "AWAITING_APPROVAL") {
      throw new ConflictException(`workflow for userId ${userId} is not awaiting approval (phase: ${row.phase})`);
    }

    const shortlist = row.shortlist as unknown as ShortlistState;

    if (decision === "APPROVE") {
      return this.approve(row.id, userId, row.addressId!, row.restaurantId!, row.optimizedCart as unknown as OptimizedCart, shortlist);
    }
    if (decision === "SKIP") {
      return this.skip(row.id, userId, shortlist);
    }
    return this.swap(row.id, userId, row.addressId!, row.restaurantId!, shortlist, (row.rejectedItemIds as string[] | null) ?? []);
  }

  private async approve(
    rowId: string,
    userId: string,
    addressId: string,
    restaurantId: string,
    cart: OptimizedCart,
    shortlist: ShortlistState,
  ) {
    if (!this.stateMachine.canTransition("AWAITING_APPROVAL", "APPROVED")) {
      throw new ConflictException("AWAITING_APPROVAL -> APPROVED transition is not permitted");
    }
    await this.prisma.workflowState.update({ where: { id: rowId }, data: { phase: "APPROVED", decision: "APPROVE" } });

    const { orderId, status } = await this.orderExecution.executeOrder({ userId, addressId, restaurantId, cart });

    if (!this.stateMachine.canTransition("APPROVED", "EXECUTING")) {
      throw new ConflictException("APPROVED -> EXECUTING transition is not permitted");
    }
    const updated = await this.prisma.workflowState.update({ where: { id: rowId }, data: { phase: "EXECUTING" } });

    try {
      await this.mealApprovedPublisher.publish({
        eventId: randomUUID(),
        occurredAt: new Date().toISOString(),
        userId,
        itemId: shortlist.currentItem.itemId,
        restaurantId,
        price: shortlist.currentItem.price,
        name: shortlist.currentItem.name,
      });
    } catch (err) {
      logger.warn({ err, userId }, "failed to publish MealApproved");
    }

    return { userId, phase: updated.phase, orderId, orderStatus: status };
  }

  private async skip(rowId: string, userId: string, shortlist: ShortlistState) {
    if (!this.stateMachine.canTransition("AWAITING_APPROVAL", "SKIPPED")) {
      throw new ConflictException("AWAITING_APPROVAL -> SKIPPED transition is not permitted");
    }
    const updated = await this.prisma.workflowState.update({
      where: { id: rowId },
      data: { phase: "SKIPPED", decision: "SKIP" },
    });

    await this.escrow.rollover(userId);

    try {
      await this.mealSkippedPublisher.publish({ eventId: randomUUID(), occurredAt: new Date().toISOString(), userId });
    } catch (err) {
      logger.warn({ err, userId }, "failed to publish MealSkipped");
    }

    return { userId, phase: updated.phase, currentItem: shortlist.currentItem };
  }

  private async swap(
    rowId: string,
    userId: string,
    addressId: string,
    restaurantId: string,
    shortlist: ShortlistState,
    rejectedItemIds: string[],
  ) {
    if (!this.stateMachine.canTransition("AWAITING_APPROVAL", "AWAITING_APPROVAL")) {
      throw new ConflictException("AWAITING_APPROVAL self-loop transition is not permitted");
    }

    const nextRejected = [...rejectedItemIds, shortlist.currentItem.itemId];
    const menuItems = await this.fetchMenu(userId, restaurantId);
    const proposal = this.selectNextCandidate(menuItems, shortlist.rankedItems, nextRejected);

    if (!proposal) {
      logger.warn({ userId }, "SWAP requested but no eligible items remain -- falling back to SKIP");
      return this.skip(rowId, userId, shortlist);
    }

    const subscription = await this.escrow.getSubscription(userId);
    const optimizedCart = await this.couponOptimization.optimizeCart({
      userId,
      restaurantId,
      addressId,
      cartItems: [{ itemId: proposal.itemId, price: proposal.price, quantity: 1 }],
      remainingDailyBudget: subscription.dailyAvgLimit,
    });

    const newShortlist: ShortlistState = { rankedItems: shortlist.rankedItems, currentItem: proposal };

    const updated = await this.prisma.workflowState.update({
      where: { id: rowId },
      data: {
        phase: "AWAITING_APPROVAL",
        shortlist: newShortlist as object,
        optimizedCart: optimizedCart as object,
        rejectedItemIds: nextRejected,
      },
    });

    await this.publishScoutCompletedAndMenuProposed(userId, menuItems, optimizedCart, /* skipScoutCompleted */ true);
    await this.dispatchMenuNotification(userId, optimizedCart);

    return { userId, phase: updated.phase, optimizedCart };
  }

  private parsePreferenceProfile(userId: string, raw: unknown) {
    const parsed = PreferenceProfileSchema.safeParse(raw);
    if (parsed.success) return parsed.data;
    logger.warn({ userId }, "user has no valid stored preference profile -- falling back to a neutral default");
    return { diet: "veg" as const, spiceLevel: 3 as const, cuisineFavorites: [] };
  }

  private async fetchMenu(userId: string, restaurantId: string): Promise<MenuItem[]> {
    let response: { success: boolean; data?: { items?: unknown[] } };
    try {
      response = await this.mcpGateway.food<{ items?: unknown[] }>("get_restaurant_menu", { restaurantId }, userId);
    } catch (err) {
      mapUpstreamError(err);
    }
    const rawItems = response.data?.items ?? [];
    const items: MenuItem[] = [];
    for (const raw of rawItems) {
      const parsed = MenuItemSchema.safeParse(raw);
      if (parsed.success) {
        items.push(parsed.data);
      }
    }
    return items;
  }

  private selectNextCandidate(menuItems: MenuItem[], rankedItems: RankedMenuItem[], rejectedItemIds: string[]): MenuItem | null {
    const menuById = new Map(menuItems.map((item) => [item.itemId, item]));
    const sorted = [...rankedItems].sort((a, b) => b.matchScore - a.matchScore);
    for (const ranked of sorted) {
      if (rejectedItemIds.includes(ranked.itemId)) continue;
      const menuItem = menuById.get(ranked.itemId);
      if (menuItem) return menuItem;
    }
    return null;
  }

  private async publishScoutCompletedAndMenuProposed(
    userId: string,
    menuItems: MenuItem[],
    optimizedCart: OptimizedCart,
    skipScoutCompleted = false,
  ) {
    if (!skipScoutCompleted) {
      try {
        await this.scoutCompletedPublisher.publish({ eventId: randomUUID(), occurredAt: new Date().toISOString(), userId });
      } catch (err) {
        logger.warn({ err, userId }, "failed to publish ScoutCompleted");
      }
    }

    const proposedIds = new Set(optimizedCart.items.map((item) => item.itemId));
    const proposedItems = menuItems.filter((item) => proposedIds.has(item.itemId));

    try {
      await this.menuProposedPublisher.publish({
        eventId: randomUUID(),
        occurredAt: new Date().toISOString(),
        userId,
        proposedItems,
      });
    } catch (err) {
      logger.warn({ err, userId }, "failed to publish MenuProposed");
    }
  }

  private async dispatchMenuNotification(userId: string, optimizedCart: OptimizedCart) {
    try {
      await this.notification.sendMenuOfTheDay(userId, optimizedCart);
    } catch (err) {
      logger.warn({ err, userId }, "failed to dispatch menu-of-the-day notification");
    }
  }
}
