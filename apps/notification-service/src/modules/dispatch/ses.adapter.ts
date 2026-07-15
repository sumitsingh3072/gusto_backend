import { Injectable } from "@nestjs/common";
import { SESClient, SESClientConfig, SendEmailCommand } from "@aws-sdk/client-ses";
import { env } from "../../config/configuration";

/**
 * Real SES email wiring. Plain-text only for now -- no HTML template exists
 * yet (no brand/design system to build against); styled HTML content is
 * intended to plug in here later without changing the calling contract.
 */
@Injectable()
export class SesAdapter {
  private readonly client: SESClient;

  constructor() {
    const isLocal = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test" || !process.env.NODE_ENV;
    const region = env.EVENT_BUS_REGION || "ap-south-1";
    const config: SESClientConfig = { region };

    if (isLocal && env.EVENT_BUS_ENDPOINT) {
      config.endpoint = env.EVENT_BUS_ENDPOINT;
      config.credentials = { accessKeyId: "mock", secretAccessKey: "mock" };
    }

    this.client = new SESClient(config);
  }

  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    // TODO: HTML template -- plain text only until a brand/design system
    // exists (see prompting_docs/notification-service-developer-docs.md).
    await this.client.send(
      new SendEmailCommand({
        Source: env.SES_FROM_EMAIL_ADDRESS,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: subject },
          Body: { Text: { Data: body } },
        },
      }),
    );
  }
}
