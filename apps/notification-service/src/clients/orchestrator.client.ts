import axios from "axios";

export class OrchestratorClient {
  constructor(private readonly baseUrl: string) {}

  submitDecision(userId: string, decision: "APPROVE" | "SWAP" | "SKIP") {
    return axios.post(`${this.baseUrl}/workflow/decision`, { userId, decision }).then((r) => r.data);
  }
}
