import { BadRequestException, Body, Controller, Get, Param, Post } from "@nestjs/common";
import { z } from "zod";
import { ContactPreferenceService } from "./contact-preference.service";

const UpsertContactPreferenceRequestSchema = z
  .object({
    userId: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().min(1).optional(),
    pushToken: z.string().min(1).optional(),
    pushPlatform: z.enum(["ios", "android"]).optional(),
    emailOptOut: z.boolean().optional(),
    pushOptOut: z.boolean().optional(),
  })
  .refine((v) => Boolean(v.pushToken) === Boolean(v.pushPlatform), {
    message: "pushToken and pushPlatform must both be present or both be absent",
  });

@Controller("notify/preferences")
export class ContactPreferenceController {
  constructor(private readonly contactPreference: ContactPreferenceService) {}

  @Post()
  upsert(@Body() body: unknown) {
    const parsed = UpsertContactPreferenceRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const { userId, ...input } = parsed.data;
    return this.contactPreference.upsert(userId, input);
  }

  @Get(":userId")
  get(@Param("userId") userId: string) {
    return this.contactPreference.get(userId);
  }
}
