import axios from "axios";
import { mapUpstreamError } from "./map-upstream-error";

export class OrchestratorClient {
  constructor(private readonly baseUrl: string) {}

  async triggerScoutRun(userId: string, addressId: string, restaurantId: string) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/workflow/scout/run`,
        { userId, addressId, restaurantId },
        { timeout: 5000 },
      );
      return response.data;
    } catch (err) {
      mapUpstreamError(err);
    }
  }
}
