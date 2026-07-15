import { Module } from "@nestjs/common";
import { ContactPreferenceController } from "./contact-preference.controller";
import { ContactPreferenceService } from "./contact-preference.service";

@Module({
  controllers: [ContactPreferenceController],
  providers: [ContactPreferenceService],
  exports: [ContactPreferenceService],
})
export class ContactPreferenceModule {}
