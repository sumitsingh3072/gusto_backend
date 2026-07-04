import { Module } from "@nestjs/common";
import { RolloverService } from "./rollover.service";

@Module({
  providers: [RolloverService],
  exports: [RolloverService],
})
export class RolloverModule {}
