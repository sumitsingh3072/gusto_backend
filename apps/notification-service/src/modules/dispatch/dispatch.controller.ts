import { Body, Controller, Post } from "@nestjs/common";
import { DispatchService } from "./dispatch.service";

@Controller("notify")
export class DispatchController {
  constructor(private readonly dispatch: DispatchService) {}

  // POST /notify/send -- called by orchestrator-service / order-execution-service
  @Post("send")
  send(@Body() body: { userId: string; type: string; [key: string]: unknown }) {
    return this.dispatch.send(body);
  }
}
