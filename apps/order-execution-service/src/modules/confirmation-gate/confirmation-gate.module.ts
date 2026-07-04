import { Module } from "@nestjs/common";
import { ConfirmationGateService } from "./confirmation-gate.service";

@Module({
  providers: [ConfirmationGateService],
  exports: [ConfirmationGateService],
})
export class ConfirmationGateModule {}
