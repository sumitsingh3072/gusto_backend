import pino from "pino";

/**
 * Structured JSON logger shared by every service. serviceName is injected at
 * bootstrap so logs are filterable by service in CloudWatch/Grafana without
 * each service reinventing log shape.
 */
export function createLogger(serviceName: string) {
  return pino({
    name: serviceName,
    level: process.env.LOG_LEVEL ?? "info",
    formatters: {
      level(label) {
        return { level: label };
      },
    },
  });
}
