import { Injectable } from "@nestjs/common";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "../../config/configuration";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12; // NIST-recommended IV length for GCM

/**
 * Encrypts/decrypts the Swiggy MCP access token before it touches Postgres
 * (users.encrypted_mcp_token). mcp-gateway-service never stores this token
 * itself -- it asks auth-service for a short-lived decrypted token per call.
 *
 * On-disk format: base64(iv) + "." + base64(authTag) + "." + base64(ciphertext)
 * AES-GCM is authenticated encryption -- decrypt() throws if the ciphertext
 * or tag have been tampered with, rather than silently returning garbage.
 */
@Injectable()
export class TokenVaultService {
  private readonly key = Buffer.from(env.MCP_TOKEN_ENCRYPTION_KEY, "base64");

  encrypt(rawToken: string): string {
    const iv = randomBytes(IV_LENGTH_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(rawToken, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(".");
  }

  decrypt(encryptedToken: string): string {
    const [ivB64, authTagB64, ciphertextB64] = encryptedToken.split(".");
    if (!ivB64 || !authTagB64 || !ciphertextB64) {
      throw new Error("Malformed encrypted token: expected 'iv.authTag.ciphertext'");
    }

    const iv = Buffer.from(ivB64, "base64");
    const authTag = Buffer.from(authTagB64, "base64");
    const ciphertext = Buffer.from(ciphertextB64, "base64");

    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);

    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString("utf8");
  }
}
