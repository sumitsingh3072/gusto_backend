import { BadRequestException, Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { createLogger } from "@gusto/logger";
import { SnsAdapter } from "./sns.adapter";
import { SesAdapter } from "./ses.adapter";
import { PrismaService } from "../../prisma/prisma.service";
import { ContactPreferenceService } from "../contact-preference/contact-preference.service";
import { NotificationSentPublisher } from "../../events/publishers/notification-sent.publisher";
import { env } from "../../config/configuration";

const logger = createLogger("notification-service:dispatch-service");

const NOTIFICATION_TYPES = ["MENU_OF_THE_DAY", "CONFIRM_PAYMENT", "ORDER_STATUS"] as const;
type NotificationType = (typeof NOTIFICATION_TYPES)[number];

type Channel = "email" | "push";

export interface DispatchResult {
  channel: Channel;
  success: boolean;
  error?: string;
}

// TODO: HTML template -- plain-text-only formatting until a brand/design
// system exists (see prompting_docs/notification-service-developer-docs.md).
function subjectFor(type: NotificationType): string {
  switch (type) {
    case "MENU_OF_THE_DAY":
      return "Your meal cart is ready for review";
    case "CONFIRM_PAYMENT":
      return "Confirm your order";
    case "ORDER_STATUS":
      return "Order update";
  }
}

function bodyFor(type: NotificationType, payload: Record<string, unknown>): string {
  switch (type) {
    case "MENU_OF_THE_DAY": {
      const items = Array.isArray(payload.proposedItems) ? (payload.proposedItems as Array<{ name?: string }>) : [];
      const names = items.map((i) => i.name).filter(Boolean).join(", ");
      return names ? `Today's cart: ${names}. Review and place your order.` : "Your cart is ready. Review and place your order.";
    }
    case "CONFIRM_PAYMENT":
      return `Please confirm order ${payload.orderId ?? ""} to proceed.`;
    case "ORDER_STATUS":
      return `Order ${payload.orderId ?? ""} status: ${payload.status ?? "updated"}.`;
  }
}

/**
 * Fans a notification out to every channel the user has contact info for
 * (email if set and not opted out; push if a token is on file and not
 * opted out) -- see prompting_docs/notification-service-developer-docs.md
 * for why channel selection is per-user rather than fixed per type.
 */
@Injectable()
export class DispatchService {
  constructor(
    private readonly sns: SnsAdapter,
    private readonly ses: SesAdapter,
    private readonly prisma: PrismaService,
    private readonly contactPreference: ContactPreferenceService,
    private readonly notificationSentPublisher: NotificationSentPublisher,
  ) {}

  async send(payload: { userId: string; type: string; [key: string]: unknown }) {
    const { userId, type, ...rest } = payload;
    if (!NOTIFICATION_TYPES.includes(type as NotificationType)) {
      throw new BadRequestException(`unknown notification type ${type}`);
    }
    const notificationType = type as NotificationType;

    const contact = await this.contactPreference.findOrNull(userId);
    if (!contact) {
      logger.warn({ userId, type: notificationType }, "no contact preference on file; nothing to dispatch");
      return { userId, type: notificationType, dispatched: [] as DispatchResult[] };
    }

    const dispatched: DispatchResult[] = [];

    if (contact.email && !contact.emailOptOut) {
      dispatched.push(await this.dispatchEmail(userId, notificationType, rest, contact.email));
    }

    if (contact.pushToken && !contact.pushOptOut) {
      dispatched.push(await this.dispatchPush(userId, notificationType, rest, contact));
    }

    return { userId, type: notificationType, dispatched };
  }

  private async dispatchEmail(
    userId: string,
    type: NotificationType,
    payload: Record<string, unknown>,
    email: string,
  ): Promise<DispatchResult> {
    try {
      await this.ses.sendEmail(email, subjectFor(type), bodyFor(type, payload));
      await this.recordSent(userId, type, payload, "email");
      return { channel: "email", success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ userId, type, err }, "email dispatch failed");
      return { channel: "email", success: false, error: message };
    }
  }

  private async dispatchPush(
    userId: string,
    type: NotificationType,
    payload: Record<string, unknown>,
    contact: { pushToken: string | null; pushPlatform: string | null; pushEndpointArn: string | null },
  ): Promise<DispatchResult> {
    try {
      const endpointArn = contact.pushEndpointArn ?? (await this.ensurePushEndpoint(userId, contact));
      await this.sns.publish(endpointArn, { type, ...payload });
      await this.recordSent(userId, type, payload, "push");
      return { channel: "push", success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ userId, type, err }, "push dispatch failed");
      return { channel: "push", success: false, error: message };
    }
  }

  private async ensurePushEndpoint(
    userId: string,
    contact: { pushToken: string | null; pushPlatform: string | null },
  ): Promise<string> {
    const platformArn =
      contact.pushPlatform === "ios" ? env.SNS_IOS_PLATFORM_APPLICATION_ARN : env.SNS_ANDROID_PLATFORM_APPLICATION_ARN;
    if (!platformArn) {
      throw new Error(`no SNS platform application ARN configured for platform ${contact.pushPlatform}`);
    }
    if (!contact.pushToken) {
      throw new Error("no push token on file");
    }
    const endpointArn = await this.sns.createEndpoint(platformArn, contact.pushToken);
    await this.contactPreference.setPushEndpointArn(userId, endpointArn);
    return endpointArn;
  }

  private async recordSent(userId: string, type: NotificationType, payload: Record<string, unknown>, channel: Channel) {
    await this.prisma.notificationLog.create({
      data: { userId, type, payload: payload as object, channel },
    });
    await this.notificationSentPublisher.publish({
      eventId: randomUUID(),
      occurredAt: new Date().toISOString(),
      userId,
      notificationType: type,
      channel,
    });
  }
}
