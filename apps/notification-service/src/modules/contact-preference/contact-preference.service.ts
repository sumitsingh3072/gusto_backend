import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

export interface UpsertContactPreferenceInput {
  email?: string;
  phone?: string;
  pushToken?: string;
  pushPlatform?: "ios" | "android";
  emailOptOut?: boolean;
  pushOptOut?: boolean;
}

/**
 * Owns per-user delivery info -- this is the API surface future app/website
 * frontends (built in separate repos) integrate against to register how a
 * user can be reached, before any real onboarding UI exists.
 */
@Injectable()
export class ContactPreferenceService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(userId: string, input: UpsertContactPreferenceInput) {
    return this.prisma.contactPreference.upsert({
      where: { userId },
      create: { userId, ...input },
      update: { ...input },
    });
  }

  async get(userId: string) {
    const pref = await this.prisma.contactPreference.findUnique({ where: { userId } });
    if (!pref) throw new NotFoundException(`no contact preference for userId ${userId}`);
    return pref;
  }

  // Best-effort lookup used internally by DispatchService -- a missing
  // preference row is a normal "nothing to dispatch to yet" state, not an
  // error worth throwing over.
  async findOrNull(userId: string) {
    return this.prisma.contactPreference.findUnique({ where: { userId } });
  }

  async setPushEndpointArn(userId: string, pushEndpointArn: string) {
    return this.prisma.contactPreference.update({ where: { userId }, data: { pushEndpointArn } });
  }
}
