import axios from "axios";

export class OrchestratorClient {
  constructor(private readonly baseUrl: string) {}

  triggerScoutRun(userId: string, addressId: string, restaurantId: string) {
    return axios.post(`${this.baseUrl}/workflow/scout/run`, { userId, addressId, restaurantId }).then((r) => r.data);
  }
}
