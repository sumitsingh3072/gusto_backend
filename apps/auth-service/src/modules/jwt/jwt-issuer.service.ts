import { Injectable } from "@nestjs/common";

@Injectable()
export class JwtIssuerService {
  issue(userId: string): string {
    throw new Error("not implemented in scaffold");
  }

  verify(token: string): { userId: string } {
    throw new Error("not implemented in scaffold");
  }
}
