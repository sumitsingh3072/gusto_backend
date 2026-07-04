import axios from "axios";

export class OrchestratorClient {
  constructor(private readonly baseUrl: string) {}

  submitDecision(decision: "APPROVE" | "SWAP" | "SKIP") {
    return axios.post(`${this.baseUrl}/workflow/decision`, { decision }).then((r) => r.data);
  }
}
