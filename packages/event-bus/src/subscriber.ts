export type EventHandler<T> = (payload: T) => Promise<void>;

export class EventSubscriber {
  constructor(private readonly queueUrl: string) {}

  async on<T>(eventType: string, handler: EventHandler<T>): Promise<void> {
    // Long-polls the service's own SQS queue (subscribed to the relevant
    // EventBridge rules) and dispatches to the handler. Dead-letter queue
    // configuration lives in infra/terraform/modules/sqs-eventbridge.
    throw new Error("not implemented in scaffold");
  }
}
