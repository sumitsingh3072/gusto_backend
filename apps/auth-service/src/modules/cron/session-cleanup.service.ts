import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { createLogger } from "@gusto/logger";
import { OAuthService } from "../oauth/oauth.service";

const logger = createLogger("auth-service:session-cleanup");

// Cleanup was previously opportunistic-only (swept at the top of the next
// login/start call) -- acceptable at low volume but leaves stale rows
// accumulating indefinitely if login volume is low relative to session
// creation. See KNOWN_ISSUES.md item 11.
@Injectable()
export class SessionCleanupService {
  constructor(private readonly oauthService: OAuthService) {}

  @Cron("0 * * * *") // hourly
  async sweep(): Promise<void> {
    try {
      await this.oauthService.sweepExpiredSessions();
    } catch (err) {
      logger.warn({ err }, "PendingAuthSession cron sweep failed; will retry next hour");
    }
  }
}
