const sendMock = jest.fn();

jest.mock("@aws-sdk/client-ses", () => {
  const actual = jest.requireActual("@aws-sdk/client-ses");
  return {
    ...actual,
    SESClient: jest.fn().mockImplementation(() => ({ send: sendMock })),
  };
});

import { SesAdapter } from "./ses.adapter";
import { SendEmailCommand } from "@aws-sdk/client-ses";

describe("SesAdapter", () => {
  let adapter: SesAdapter;

  beforeEach(() => {
    sendMock.mockReset();
    sendMock.mockResolvedValue({});
    adapter = new SesAdapter();
  });

  it("sends a plain-text email with the configured From address", async () => {
    await adapter.sendEmail("user@example.com", "Subject line", "Body text");

    expect(sendMock).toHaveBeenCalledWith(expect.any(SendEmailCommand));
    const command = sendMock.mock.calls[0][0] as SendEmailCommand;
    expect(command.input.Source).toBe("noreply@gusto.dev");
    expect(command.input.Destination?.ToAddresses).toEqual(["user@example.com"]);
    expect(command.input.Message?.Subject?.Data).toBe("Subject line");
    expect(command.input.Message?.Body?.Text?.Data).toBe("Body text");
  });
});
