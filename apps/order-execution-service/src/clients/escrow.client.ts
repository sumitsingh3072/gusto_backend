import axios from "axios";

/**
 * Reserve/capture/release only -- no plain debit() here. This service must
 * use exactly one payment path (see prompting_docs/KNOWN_ISSUES.md item 17):
 * reserve() before place_food_order, capture() on success, release() on
 * failure. A raw debit() call would risk the same double-debit/loss-of-funds
 * hazard the reserve/capture/release design was built to close.
 */
export class EscrowClient {
  constructor(private readonly baseUrl: string) {}

  reserve(userId: string, amount: number) {
    return axios.post(`${this.baseUrl}/wallet/reserve`, { userId, amount }, { timeout: 5000 }).then((r) => r.data);
  }

  capture(userId: string, amount: number) {
    return axios.post(`${this.baseUrl}/wallet/capture`, { userId, amount }, { timeout: 5000 }).then((r) => r.data);
  }

  release(userId: string, amount: number) {
    return axios.post(`${this.baseUrl}/wallet/release`, { userId, amount }, { timeout: 5000 }).then((r) => r.data);
  }
}
