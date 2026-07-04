import axios from "axios";
import { OptimizedCart } from "@gusto/contracts";

export class CouponOptimizationClient {
  constructor(private readonly baseUrl: string) {}

  optimizeCart(shortlist: unknown): Promise<OptimizedCart> {
    return axios.post(`${this.baseUrl}/optimize/cart`, { shortlist }).then((r) => r.data);
  }
}
