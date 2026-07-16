import axios from "axios";
import { mapUpstreamError } from "./map-upstream-error";

export interface EscrowSubscription {
  userId: string;
  totalDeposited: number;
  currentBalance: number;
  reservedAmount: number;
  daysLeft: number;
  dailyAvgLimit: number;
}

export class EscrowClient {
  constructor(private readonly baseUrl: string) {}

  async getSubscription(userId: string): Promise<EscrowSubscription> {
    try {
      const response = await axios.get(`${this.baseUrl}/wallet/subscription/${userId}`, { timeout: 5000 });
      return response.data;
    } catch (err) {
      mapUpstreamError(err);
    }
  }

  async rollover(userId: string) {
    try {
      const response = await axios.post(`${this.baseUrl}/wallet/rollover`, { userId }, { timeout: 5000 });
      return response.data;
    } catch (err) {
      mapUpstreamError(err);
    }
  }
}
