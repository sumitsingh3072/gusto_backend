import axios from "axios";

export class EscrowClient {
  constructor(private readonly baseUrl: string) {}

  debit(userId: string, amount: number, savingsAchieved: number) {
    return axios.post(`${this.baseUrl}/wallet/debit`, { userId, amount, savingsAchieved }).then((r) => r.data);
  }
}
