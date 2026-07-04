import { Module } from "@nestjs/common";
import { DispatchController } from "./dispatch.controller";
import { DispatchService } from "./dispatch.service";
import { SnsAdapter } from "./sns.adapter";

@Module({
  controllers: [DispatchController],
  providers: [DispatchService, SnsAdapter],
})
export class DispatchModule {}
