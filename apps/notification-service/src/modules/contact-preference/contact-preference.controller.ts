import { BadRequestException, Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from "@nestjs/swagger";
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

@ApiTags("Notification - Contact Preference")
@ApiBearerAuth()
@Controller("notify/preferences")
export class ContactPreferenceController {
  constructor(private readonly contactPreference: ContactPreferenceService) {}

  @Post()
  @ApiOperation({ summary: "Upsert contact preference", description: "Creates or updates a user's notification contact preferences (email, phone, push)." })
  @ApiResponse({ status: 200, description: "Contact preference upserted successfully" })
  @ApiResponse({ status: 400, description: "Bad request — invalid input" })
  upsert(@Body() body: unknown) {
    const parsed = UpsertContactPreferenceRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const { userId, ...input } = parsed.data;
    return this.contactPreference.upsert(userId, input);
  }

  @Get(":userId")
  @ApiOperation({ summary: "Get contact preference", description: "Retrieves the notification contact preferences for a given user." })
  @ApiParam({ name: "userId", description: "The user ID to look up contact preferences for" })
  @ApiResponse({ status: 200, description: "Contact preference returned" })
  @ApiResponse({ status: 400, description: "Bad request" })
  get(@Param("userId") userId: string) {
    return this.contactPreference.get(userId);
  }
}
