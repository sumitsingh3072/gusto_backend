import axios from "axios";

export class OrderExecutionClient {
  constructor(private readonly baseUrl: string) {}

  executeOrder(cart: unknown, userId: string) {
    return axios.post(`${this.baseUrl}/orders/execute`, { cart, userId }).then((r) => r.data);
  }
}
