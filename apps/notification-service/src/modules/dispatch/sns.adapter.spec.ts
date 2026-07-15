const sendMock = jest.fn();

jest.mock("@aws-sdk/client-sns", () => {
  const actual = jest.requireActual("@aws-sdk/client-sns");
  return {
    ...actual,
    SNSClient: jest.fn().mockImplementation(() => ({ send: sendMock })),
  };
});

import { SnsAdapter } from "./sns.adapter";
import { CreatePlatformEndpointCommand, PublishCommand } from "@aws-sdk/client-sns";

describe("SnsAdapter", () => {
  let adapter: SnsAdapter;

  beforeEach(() => {
    sendMock.mockReset();
    adapter = new SnsAdapter();
  });

  describe("createEndpoint", () => {
    it("returns the created EndpointArn", async () => {
      sendMock.mockResolvedValue({ EndpointArn: "arn:aws:sns:endpoint-1" });
      const result = await adapter.createEndpoint("arn:aws:sns:platform", "tok-1");

      expect(sendMock).toHaveBeenCalledWith(expect.any(CreatePlatformEndpointCommand));
      expect(result).toBe("arn:aws:sns:endpoint-1");
    });

    it("throws if SNS returns no EndpointArn", async () => {
      sendMock.mockResolvedValue({});
      await expect(adapter.createEndpoint("arn:aws:sns:platform", "tok-1")).rejects.toThrow(
        "SNS did not return an EndpointArn",
      );
    });
  });

  describe("publish", () => {
    it("publishes a JSON-structured message with a default key", async () => {
      sendMock.mockResolvedValue({});
      await adapter.publish("arn:aws:sns:endpoint-1", { type: "ORDER_STATUS", orderId: "order-1" });

      expect(sendMock).toHaveBeenCalledWith(expect.any(PublishCommand));
      const command = sendMock.mock.calls[0][0] as PublishCommand;
      expect(command.input.TargetArn).toBe("arn:aws:sns:endpoint-1");
      expect(command.input.MessageStructure).toBe("json");
      const parsed = JSON.parse(command.input.Message as string);
      expect(JSON.parse(parsed.default)).toEqual({ type: "ORDER_STATUS", orderId: "order-1" });
    });
  });
});
