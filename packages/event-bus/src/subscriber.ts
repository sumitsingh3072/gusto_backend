import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand, Message, SQSClientConfig } from "@aws-sdk/client-sqs";

export type EventHandler<T> = (payload: T) => Promise<void>;

export class EventSubscriber {
  private readonly client: SQSClient;
  private isRunning: boolean = false;

  constructor(private readonly queueUrl: string) {
    const isLocal = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test" || !process.env.NODE_ENV;
    const region = process.env.EVENT_BUS_REGION || "ap-south-1";
    const endpoint = process.env.EVENT_BUS_ENDPOINT;

    const config: SQSClientConfig = {
      region,
    };

    if (isLocal && endpoint) {
      config.endpoint = endpoint;
      config.credentials = {
        accessKeyId: "mock",
        secretAccessKey: "mock",
      };
    }

    this.client = new SQSClient(config);
  }

  async on<T>(eventType: string, handler: EventHandler<T>): Promise<void> {
    if (this.isRunning) {
      return;
    }
    this.isRunning = true;
    this.poll(eventType, handler);
  }

  private async poll<T>(eventType: string, handler: EventHandler<T>): Promise<void> {
    while (this.isRunning) {
      try {
        const command = new ReceiveMessageCommand({
          QueueUrl: this.queueUrl,
          MaxNumberOfMessages: 10,
          WaitTimeSeconds: 20, // Long polling
        });

        const response = await this.client.send(command);

        if (response.Messages) {
          for (const message of response.Messages) {
            await this.processMessage(message, eventType, handler);
          }
        }
      } catch (error) {
        console.error("SQS Receive Error:", error);
        // Sleep on error to avoid slamming endpoint in error state
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  private async processMessage<T>(
    message: Message,
    eventType: string,
    handler: EventHandler<T>
  ): Promise<void> {
    try {
      if (!message.Body) return;

      const body = JSON.parse(message.Body);
      
      let payload: T;
      let msgEventType: string;

      if (body.DetailType && body.Detail) {
        msgEventType = body.DetailType;
        payload = JSON.parse(body.Detail);
      } else {
        msgEventType = body.eventType || eventType;
        payload = body.payload || body;
      }

      if (msgEventType === eventType) {
        await handler(payload);
      }

      const deleteCommand = new DeleteMessageCommand({
        QueueUrl: this.queueUrl,
        ReceiptHandle: message.ReceiptHandle!,
      });
      await this.client.send(deleteCommand);
    } catch (error) {
      console.error("SQS Process Error:", error);
    }
  }

  stop(): void {
    this.isRunning = false;
  }
}

