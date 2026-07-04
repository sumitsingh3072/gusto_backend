import { Injectable } from "@nestjs/common";

@Injectable()
export class SnsAdapter {
  push(userId: string, message: Record<string, unknown>) {
    throw new Error("not implemented in scaffold");
  }
}
