import { EventBridgeClient, PutEventsCommand, EventBridgeClientConfig } from "@aws-sdk/client-eventbridge";

export interface EventEnvelope<T = unknown> {
  eventType: string;
  payload: T;
}

export class EventPublisher {
  private readonly client: EventBridgeClient;

  constructor(busEndpoint: string, private readonly source: string) {
    const isLocal = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test" || !process.env.NODE_ENV;
    const region = process.env.EVENT_BUS_REGION || "ap-south-1";

    const config: EventBridgeClientConfig = {
      region,
    };

    if (isLocal && busEndpoint) {
      config.endpoint = busEndpoint;
      config.credentials = {
        accessKeyId: "mock",
        secretAccessKey: "mock",
      };
    }

    this.client = new EventBridgeClient(config);
  }

  async publish<T>(eventType: string, payload: T): Promise<void> {
    const entry = {
      Source: this.source,
      DetailType: eventType,
      Detail: JSON.stringify(payload),
      EventBusName: "default",
    };

    const command = new PutEventsCommand({
      Entries: [entry],
    });

    await this.client.send(command);
  }
}

