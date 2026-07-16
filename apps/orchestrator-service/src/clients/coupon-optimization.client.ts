import axios from "axios";
import { OptimizeCartRequest, OptimizedCart } from "@gusto/contracts";
import { mapUpstreamError } from "./map-upstream-error";

export class CouponOptimizationClient {
  constructor(private readonly baseUrl: string) {}

  async optimizeCart(request: OptimizeCartRequest): Promise<OptimizedCart> {
    try {
      const response = await axios.post(`${this.baseUrl}/optimize/cart`, request, { timeout: 5000 });
      return response.data;
    } catch (err) {
      mapUpstreamError(err);
    }
  }
}
