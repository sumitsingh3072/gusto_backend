import { Module } from "@nestjs/common";
import { HackerController } from "./hacker.controller";
import { HackerService } from "./hacker.service";
import { HackerAlgorithm } from "./hacker.algorithm";

@Module({
  controllers: [HackerController],
  providers: [HackerService, HackerAlgorithm],
})
export class HackerModule {}
