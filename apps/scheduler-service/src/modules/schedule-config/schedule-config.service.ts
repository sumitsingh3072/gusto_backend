import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class ScheduleConfigService {
  constructor(private readonly prisma: PrismaService) {}

  upsert(userId: string, scoutTime: Date, notifyTime: Date, executeTime: Date, timezone: string) {
    return this.prisma.scheduleConfig.upsert({
      where: { userId },
      create: { userId, scoutTime, notifyTime, executeTime, timezone },
      update: { scoutTime, notifyTime, executeTime, timezone },
    });
  }
}
