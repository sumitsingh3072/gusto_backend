import { Injectable } from "@nestjs/common";
import {
  SNSClient,
  SNSClientConfig,
  CreatePlatformEndpointCommand,
  PublishCommand,
} from "@aws-sdk/client-sns";
import { env } from "../../config/configuration";

/**
 * Real SNS mobile-push wiring. Structurally complete but untestable
 * end-to-end in this environment: SNS mobile push needs a real platform
 * application ARN (from a registered iOS/Android app in AWS SNS) and a real
 * device push token, neither of which exist until a mobile app is actually
 * built (see prompting_docs/notification-service-developer-docs.md).
 */
@Injectable()
export class SnsAdapter {
  private readonly client: SNSClient;

  constructor() {
    const isLocal = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test" || !process.env.NODE_ENV;
    const region = env.EVENT_BUS_REGION || "ap-south-1";
    const config: SNSClientConfig = { region };

    if (isLocal && env.EVENT_BUS_ENDPOINT) {
      config.endpoint = env.EVENT_BUS_ENDPOINT;
      config.credentials = { accessKeyId: "mock", secretAccessKey: "mock" };
    }

    this.client = new SNSClient(config);
  }

  async createEndpoint(platformApplicationArn: string, pushToken: string): Promise<string> {
    const result = await this.client.send(
      new CreatePlatformEndpointCommand({ PlatformApplicationArn: platformApplicationArn, Token: pushToken }),
    );
    if (!result.EndpointArn) throw new Error("SNS did not return an EndpointArn");
    return result.EndpointArn;
  }

  async publish(endpointArn: string, message: Record<string, unknown>): Promise<void> {
    // SNS's "json" MessageStructure requires at minimum a "default" key --
    // per-protocol (APNS/GCM) payloads can be added here later once a real
    // mobile app defines its own push payload shape.
    await this.client.send(
      new PublishCommand({
        TargetArn: endpointArn,
        Message: JSON.stringify({ default: JSON.stringify(message) }),
        MessageStructure: "json",
      }),
    );
  }
}
