import { Injectable } from "@nestjs/common";
import { SnsAdapter } from "./sns.adapter";

@Injectable()
export class DispatchService {
  constructor(private readonly sns: SnsAdapter) {}

  async send(payload: { userId: string; type: string; [key: string]: unknown }) {
    throw new Error("not implemented in scaffold");
  }
}
