import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "../../prisma/generated/client";

/**
 * escrow-service's single connection into the `escrow` Postgres schema. No
 * other service imports this class or the generated client directly -- reads
 * from other services go through escrow-service's HTTP API instead (see
 * docs/adr/0001-microservices-with-per-service-prisma-schemas.md).
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
