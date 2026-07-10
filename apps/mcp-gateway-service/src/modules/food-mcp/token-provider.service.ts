import { Injectable, InternalServerErrorException } from "@nestjs/common";
import axios from "axios";
import { env } from "../../config/configuration";

@Injectable()
export class TokenProviderService {
  // Simple in-memory cache: userId -> { token, expiresAt }
  // We use 30s TTL per user to avoid hitting auth-service on every single MCP tool call.
  private cache = new Map<string, { token: string; expiresAt: number }>();
  private readonly CACHE_TTL_MS = 30 * 1000;

  async getToken(userId: string): Promise<string> {
    const cached = this.cache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.token;
    }

    try {
      const response = await axios.post<{ token: string }>(
        `${env.AUTH_SERVICE_URL}/auth/internal/token`,
        { userId },
        { headers: { "Content-Type": "application/json" } }
      );

      const token = response.data.token;
      
      this.cache.set(userId, {
        token,
        expiresAt: Date.now() + this.CACHE_TTL_MS,
      });

      return token;
    } catch (error) {
      // In production, we'd log this properly
      throw new InternalServerErrorException("Failed to retrieve MCP token from Auth Service");
    }
  }
}
