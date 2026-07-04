import { Injectable } from "@nestjs/common";
import { McpGatewayClient } from "@gusto/mcp-client-sdk";
import { ConfirmationGateService } from "../confirmation-gate/confirmation-gate.service";

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
  ) {}

  async populateAndAwaitConfirmation(cart: unknown, userId: string) {
    throw new Error("not implemented in scaffold");
  }

  async confirmAndPlace(orderId: string) {
    throw new Error("not implemented in scaffold");
  }

  async getStatus(orderId: string) {
    throw new Error("not implemented in scaffold");
  }

  async pollDeliveryStatus(orderId: string) {
    throw new Error("not implemented in scaffold");
  }
}
