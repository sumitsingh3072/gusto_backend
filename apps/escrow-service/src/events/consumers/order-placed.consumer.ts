import { OrderPlacedEvent } from "@gusto/contracts";
import { EventSubscriber } from "@gusto/event-bus";
import { createLogger } from "@gusto/logger";
import { WalletService } from "../../modules/wallet/wallet.service";

const logger = createLogger("escrow-service:order-placed-consumer");

export function registerOrderPlacedConsumer(subscriber: EventSubscriber, wallet: WalletService) {
  return subscriber.on<OrderPlacedEvent>("OrderPlaced", async (event) => {
    // Let a genuine failure (e.g. overdraft conflict) propagate -- the
    // message is then NOT deleted from the queue and is retried after the
    // visibility timeout. Do not swallow errors here.
    await wallet.debit(event.userId, event.cart.finalTotal, event.cart.savingsAchieved);
    logger.info({ userId: event.userId, orderId: event.orderId }, "debited subscription for OrderPlaced");
  });
}
