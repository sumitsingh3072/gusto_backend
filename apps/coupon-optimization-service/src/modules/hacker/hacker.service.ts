import { Injectable } from "@nestjs/common";
import { HackerAlgorithm, OptimizationInput } from "./hacker.algorithm";
import { McpGatewayClient } from "@gusto/mcp-client-sdk";
import { OptimizeCartRequest, OptimizedCart, FillerCandidate } from "@gusto/contracts";
import { CartOptimizedPublisher } from "../../events/publishers/cart-optimized.publisher";
import { mapFetchFoodCouponsResponse } from "./mapping/coupon-response.mapper";
import { mapMenuResponseToFillerCandidates } from "./mapping/menu-response.mapper";
import { createLogger } from "@gusto/logger";
import { randomUUID } from "crypto";

const logger = createLogger("coupon-optimization-service:hacker-service");

// Bounded pagination for get_restaurant_menu -- keeps filler-candidate
// gathering inside the T-30-minute execution window rather than fetching
// unboundedly across a large menu (see implementation plan §4.6).
const MAX_MENU_PAGES = 6;
const MIN_FILLER_CANDIDATES_TARGET = 60;

/**
 * Fully stateless -- no database of its own. Reads live coupon/menu data via
 * mcp-gateway-service on every call and hands the math to HackerAlgorithm.
 */
@Injectable()
export class HackerService {
  constructor(
    private readonly algorithm: HackerAlgorithm,
    private readonly mcpGateway: McpGatewayClient,
    private readonly publisher: CartOptimizedPublisher,
  ) {}

  async optimize(request: OptimizeCartRequest): Promise<OptimizedCart> {
    const coupons = await this.fetchCoupons(request);
    const fillerCandidates = await this.fetchFillerCandidates(request);

    const input: OptimizationInput = {
      cartItems: request.cartItems,
      coupons,
      fillerCandidates,
      remainingDailyBudget: request.remainingDailyBudget,
      now: new Date(),
    };

    const result = this.algorithm.optimize(input);

    const fillerItemIds = new Set(request.cartItems.map((item) => item.itemId));
    const fillerItems = result.finalItems.filter((item) => !fillerItemIds.has(item.itemId));
    const fillerCandidateByItemId = new Map(fillerCandidates.map((candidate) => [candidate.itemId, candidate]));
    const fillerCost = fillerItems.reduce((sum, item) => {
      const candidate = fillerCandidateByItemId.get(item.itemId);
      return sum + (candidate ? candidate.price * item.quantity : 0);
    }, 0);
    const discountApplied = result.baseTotal + fillerCost - result.finalTotal;

    const optimizedCart: OptimizedCart = {
      items: result.finalItems,
      baseCost: result.baseTotal,
      fillerCost,
      discountApplied,
      finalTotal: result.finalTotal,
      savingsAchieved: result.savingsAchieved,
      couponCode: result.appliedCouponCode ?? undefined,
      overBudget: result.overBudget,
      decisionLog: result.decisionLog,
    };

    // The event bus is a best-effort side channel -- a publish failure must
    // never take down the synchronous response the caller is waiting on for
    // an immediate answer (this endpoint's whole reason for being sync).
    try {
      await this.publisher.publish({
        eventId: randomUUID(),
        occurredAt: new Date().toISOString(),
        userId: request.userId,
        optimizedCart,
      });
    } catch (err) {
      logger.warn({ err, userId: request.userId }, "failed to publish CartOptimized; returning result to caller anyway");
    }

    return optimizedCart;
  }

  private async fetchCoupons(request: OptimizeCartRequest) {
    try {
      const response = await this.mcpGateway.food(
        "fetch_food_coupons",
        { restaurantId: request.restaurantId, addressId: request.addressId },
        request.userId,
      );
      if (!response.success) {
        logger.warn({ error: response.error, userId: request.userId }, "fetch_food_coupons returned a domain failure; proceeding with no coupons");
        return [];
      }
      return mapFetchFoodCouponsResponse(response.data);
    } catch (err) {
      logger.warn({ err, userId: request.userId }, "fetch_food_coupons call failed; proceeding with no coupons");
      return [];
    }
  }

  private async fetchFillerCandidates(request: OptimizeCartRequest): Promise<FillerCandidate[]> {
    const candidates: FillerCandidate[] = [];
    for (let page = 1; page <= MAX_MENU_PAGES; page++) {
      try {
        const response = await this.mcpGateway.food(
          "get_restaurant_menu",
          { addressId: request.addressId, restaurantId: request.restaurantId, page },
          request.userId,
        );
        if (!response.success) {
          logger.warn({ error: response.error, userId: request.userId, page }, "get_restaurant_menu returned a domain failure; stopping pagination");
          break;
        }
        const pageItems = mapMenuResponseToFillerCandidates(response.data);
        if (pageItems.length === 0) break; // menu exhausted, no point requesting further pages
        candidates.push(...pageItems);
      } catch (err) {
        logger.warn({ err, userId: request.userId, page }, "get_restaurant_menu call failed; stopping pagination");
        break;
      }
      if (candidates.length >= MIN_FILLER_CANDIDATES_TARGET) break;
    }
    return candidates;
  }
}
