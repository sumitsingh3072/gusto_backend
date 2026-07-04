import { Injectable } from "@nestjs/common";

/**
 * Human-in-the-loop guardrail: Gusto NEVER places an order without a
 * biometric/PIN confirmation from the user, requested via notification-service.
 */
@Injectable()
export class ConfirmationGateService {
  requestConfirmation(orderId: string, userId: string) {
    throw new Error("not implemented in scaffold");
  }

  isConfirmed(orderId: string): Promise<boolean> {
    throw new Error("not implemented in scaffold");
  }
}
