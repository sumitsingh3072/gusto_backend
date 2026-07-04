/**
 * Thin wrapper around SQS/EventBridge so every service publishes events the
 * same way. Each service imports this instead of talking to the AWS SDK
 * directly, keeping the transport swappable in one place.
 */
export interface EventEnvelope<T = unknown> {
  eventType: string;
  payload: T;
}

export class EventPublisher {
  constructor(private readonly busEndpoint: string, private readonly source: string) {}

  async publish<T>(eventType: string, payload: T): Promise<void> {
    // Implementation wires to EventBridge PutEvents / SQS SendMessage.
    // Kept as an interface boundary here — see infra/terraform/modules/sqs-eventbridge
    // for the topic/queue topology each event type is routed through.
    throw new Error("not implemented in scaffold");
  }
}
