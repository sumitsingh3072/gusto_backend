import { HackerService } from "./hacker.service";
import { HackerAlgorithm } from "./hacker.algorithm";
import { McpGatewayClient } from "@gusto/mcp-client-sdk";
import { CartOptimizedPublisher } from "../../events/publishers/cart-optimized.publisher";
import { OptimizeCartRequest } from "@gusto/contracts";

function createRequest(overrides: Partial<OptimizeCartRequest> = {}): OptimizeCartRequest {
  return {
    userId: "user-1",
    restaurantId: "rest-1",
    addressId: "addr-1",
    cartItems: [{ itemId: "item_1", price: 27000, quantity: 1 }],
    remainingDailyBudget: 100000,
    ...overrides,
  };
}

describe("HackerService", () => {
  let mcpGateway: jest.Mocked<Pick<McpGatewayClient, "food">>;
  let publisher: jest.Mocked<Pick<CartOptimizedPublisher, "publish">>;
  let service: HackerService;

  beforeEach(() => {
    mcpGateway = { food: jest.fn() };
    publisher = { publish: jest.fn().mockResolvedValue(undefined) };
    service = new HackerService(
      new HackerAlgorithm(),
      mcpGateway as unknown as McpGatewayClient,
      publisher as unknown as CartOptimizedPublisher,
    );
  });

  it("happy path: fetches coupons + menu, optimizes, and publishes CartOptimized", async () => {
    mcpGateway.food.mockImplementation(async (tool: string) => {
      if (tool === "fetch_food_coupons") {
        return {
          success: true,
          data: [
            {
              code: "GAP30",
              discountType: "flat",
              discountValue: 6000,
              maxDiscount: null,
              minCartValue: 30000,
              requiresOnlinePayment: true,
              isApplicable: true,
              expiresAt: null,
            },
          ],
        };
      }
      if (tool === "get_restaurant_menu") {
        return { success: true, data: { items: [{ id: "garlic_bread", price: 3500, inStock: true }] } };
      }
      throw new Error(`unexpected tool ${tool}`);
    });

    const result = await service.optimize(createRequest());

    expect(mcpGateway.food).toHaveBeenCalledWith(
      "fetch_food_coupons",
      { restaurantId: "rest-1", addressId: "addr-1" },
      "user-1",
    );
    expect(result.couponCode).toBe("GAP30");
    expect(result.finalTotal).toBe(24500);
    expect(result.decisionLog.length).toBeGreaterThan(0);
    expect(publisher.publish).toHaveBeenCalledTimes(1);
    const published = publisher.publish.mock.calls[0][0];
    expect(published.userId).toBe("user-1");
    expect(published.optimizedCart.finalTotal).toBe(24500);
  });

  it("degrades to an empty coupon list when fetch_food_coupons returns a domain failure", async () => {
    mcpGateway.food.mockImplementation(async (tool: string) => {
      if (tool === "fetch_food_coupons") {
        return { success: false, error: { message: "restaurant not found" } };
      }
      return { success: true, data: { items: [] } };
    });

    const result = await service.optimize(createRequest());

    expect(result.couponCode).toBeUndefined();
    expect(result.finalTotal).toBe(27000);
  });

  it("degrades to an empty coupon list when fetch_food_coupons rejects outright", async () => {
    mcpGateway.food.mockImplementation(async (tool: string) => {
      if (tool === "fetch_food_coupons") {
        throw new Error("network error");
      }
      return { success: true, data: { items: [] } };
    });

    const result = await service.optimize(createRequest());
    expect(result.couponCode).toBeUndefined();
  });

  it("degrades to no filler candidates when get_restaurant_menu fails on the first page", async () => {
    mcpGateway.food.mockImplementation(async (tool: string) => {
      if (tool === "fetch_food_coupons") return { success: true, data: {} };
      if (tool === "get_restaurant_menu") throw new Error("network error");
      throw new Error("unexpected");
    });

    const result = await service.optimize(createRequest());
    expect(result.finalTotal).toBe(27000);
  });

  it("still returns a 200-worthy OptimizedCart when publishing CartOptimized fails", async () => {
    mcpGateway.food.mockResolvedValue({ success: true, data: {} });
    publisher.publish.mockRejectedValue(new Error("event bus unreachable"));

    const result = await service.optimize(createRequest());
    expect(result.finalTotal).toBe(27000);
  });

  it("stops paginating get_restaurant_menu at the bounded page cap", async () => {
    let calls = 0;
    mcpGateway.food.mockImplementation(async (tool: string) => {
      if (tool === "fetch_food_coupons") return { success: true, data: {} };
      if (tool === "get_restaurant_menu") {
        calls++;
        return { success: true, data: { items: [{ id: `item_${calls}`, price: 100, inStock: true }] } };
      }
      throw new Error("unexpected");
    });

    await service.optimize(createRequest());
    const menuCalls = mcpGateway.food.mock.calls.filter(([tool]) => tool === "get_restaurant_menu");
    expect(menuCalls.length).toBeLessThanOrEqual(6);
  });
});
