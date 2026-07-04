import axios from "axios";

export class EscrowClient {
  constructor(private readonly baseUrl: string) {}

  rollover(userId: string) {
    return axios.post(`${this.baseUrl}/wallet/rollover`, { userId }).then((r) => r.data);
  }
}
