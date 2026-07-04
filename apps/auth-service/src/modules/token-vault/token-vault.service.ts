import { Injectable } from "@nestjs/common";

/**
 * Encrypts/decrypts the Swiggy MCP access token before it touches Postgres
 * (users.encrypted_mcp_token). mcp-gateway-service never stores this token
 * itself -- it asks auth-service for a short-lived decrypted token per call.
 */
@Injectable()
export class TokenVaultService {
  encrypt(rawToken: string): string {
    throw new Error("not implemented in scaffold");
  }

  decrypt(encryptedToken: string): string {
    throw new Error("not implemented in scaffold");
  }
}
