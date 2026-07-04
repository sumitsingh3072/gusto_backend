import { Injectable } from "@nestjs/common";
import axios from "axios";

/**
 * mcp-gateway-service does NOT store Swiggy tokens itself -- it asks
 * auth-service for a short-lived decrypted token per call, keeping token
 * custody in exactly one place.
 */
@Injectable()
export class TokenProviderService {
  constructor(private readonly authServiceUrl: string = process.env.AUTH_SERVICE_URL ?? "") {}

  async getTokenFor(userId: string): Promise<string> {
    throw new Error("not implemented in scaffold");
  }
}
