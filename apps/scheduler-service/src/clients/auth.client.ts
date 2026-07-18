import axios from "axios";
import { mapUpstreamError } from "./map-upstream-error";

export class AuthClient {
  constructor(private readonly baseUrl: string, private readonly internalSecret: string) {}

  async getPreferenceProfile(userId: string): Promise<{ userId: string; prefProfile: unknown }> {
    try {
      const response = await axios.get(`${this.baseUrl}/auth/internal/profile/${userId}`, {
        timeout: 5000,
        headers: { "X-Internal-Secret": this.internalSecret },
      });
      return response.data;
    } catch (err) {
      mapUpstreamError(err);
    }
  }
}
