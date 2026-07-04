import axios from "axios";

export class OrchestratorClient {
  constructor(private readonly baseUrl: string) {}

  triggerScoutRun(userId: string) {
    return axios.post(`${this.baseUrl}/workflow/scout/run`, { userId }).then((r) => r.data);
  }
}
