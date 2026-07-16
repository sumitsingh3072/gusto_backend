import { HttpException, ServiceUnavailableException } from "@nestjs/common";
import axios from "axios";

/**
 * Shared upstream-error mapping per CLAUDE.md convention: an upstream error
 * response is rethrown with the same status; an unreachable upstream maps to
 * ServiceUnavailableException (503). Never leak a raw axios error/stack
 * trace to a client. Same pattern as order-execution-service's
 * mapUpstreamError, order-execution-service's/notification-service's
 * DecisionWebhookController, etc.
 */
export function mapUpstreamError(err: unknown): never {
  if (axios.isAxiosError(err)) {
    if (err.response) {
      const message = (err.response.data as { message?: string } | undefined)?.message ?? err.message;
      throw new HttpException(message, err.response.status);
    }
    throw new ServiceUnavailableException(`upstream unreachable: ${err.message}`);
  }
  throw new ServiceUnavailableException(err instanceof Error ? err.message : "unknown upstream error");
}
