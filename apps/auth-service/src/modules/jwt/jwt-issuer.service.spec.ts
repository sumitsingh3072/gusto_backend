import { UnauthorizedException } from "@nestjs/common";
import jwt from "jsonwebtoken";
import { JwtIssuerService } from "./jwt-issuer.service";

describe("JwtIssuerService", () => {
  const issuer = new JwtIssuerService();

  it("issues a token that verify() accepts and returns the same userId", () => {
    const token = issuer.issue("user-123");
    const payload = issuer.verify(token);

    expect(payload.sub).toEqual("user-123");
  });

  it("rejects a garbage token", () => {
    expect(() => issuer.verify("not-a-real-jwt")).toThrow(UnauthorizedException);
  });

  it("rejects a token signed with a different secret", () => {
    const foreignToken = jwt.sign({ sub: "user-123" }, "a-completely-different-secret");

    expect(() => issuer.verify(foreignToken)).toThrow(UnauthorizedException);
  });
});
