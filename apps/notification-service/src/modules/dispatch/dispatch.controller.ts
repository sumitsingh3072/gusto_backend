import { Body, Controller, Post } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { DispatchService } from "./dispatch.service";

@ApiTags("Notification - Dispatch")
@ApiBearerAuth()
@Controller("notify")
export class DispatchController {
  constructor(private readonly dispatch: DispatchService) {}

  // POST /notify/send -- called by orchestrator-service / order-execution-service
  @Post("send")
  @ApiOperation({ summary: "Send notification", description: "Sends a notification to a user. Called by orchestrator-service or order-execution-service." })
  @ApiResponse({ status: 200, description: "Notification sent successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 503, description: "Service unavailable" })
  send(@Body() body: { userId: string; type: string; [key: string]: unknown }) {
    return this.dispatch.send(body);
  }
}
