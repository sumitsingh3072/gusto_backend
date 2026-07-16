import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "../../prisma/generated/client";

/**
 * scheduler-service's single connection into the `scheduler` Postgres
 * schema. No other service imports this class or the generated client
 * directly -- reads from other services go through scheduler-service's
 * HTTP API instead (see docs/adr/0001-microservices-with-per-service-prisma-schemas.md).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
