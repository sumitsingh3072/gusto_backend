import { Injectable } from "@nestjs/common";

/**
 * Implements "The Rollover": when a meal is skipped, its budget is
 * redistributed across the remaining days, enabling a "Premium Friday"
 * splurge (steak/sushi, or in future a Dineout MCP table booking).
 */
@Injectable()
export class RolloverService {
  redistribute(userId: string) {
    throw new Error("not implemented in scaffold");
  }
}
