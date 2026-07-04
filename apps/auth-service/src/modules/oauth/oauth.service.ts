import { Injectable } from "@nestjs/common";
import { TokenVaultService } from "../token-vault/token-vault.service";
import { StartLoginDto } from "./dto/start-login.dto";
import { LoginCallbackDto } from "./dto/login-callback.dto";

/**
 * Owns the OAuth 2.1 + PKCE handshake with Swiggy. This is the one exception
 * to "only mcp-gateway-service calls Swiggy" -- this is identity/token
 * issuance, not an MCP tool call, so it talks to Swiggy's OAuth endpoint
 * directly and hands the resulting token to TokenVaultService for encrypted
 * storage.
 */
@Injectable()
export class OAuthService {
  constructor(private readonly tokenVault: TokenVaultService) {}

  async startPkceFlow(dto: StartLoginDto) {
    throw new Error("not implemented in scaffold");
  }

  async exchangeCodeForToken(dto: LoginCallbackDto) {
    throw new Error("not implemented in scaffold");
  }

  async refresh(refreshToken: string) {
    throw new Error("not implemented in scaffold");
  }
}
