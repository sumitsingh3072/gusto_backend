import axios from "axios";
import { OptimizedCart } from "@gusto/contracts";
import { mapUpstreamError } from "./map-upstream-error";

export interface ExecuteOrderRequest {
  userId: string;
  addressId: string;
  restaurantId: string;
  cart: OptimizedCart;
  paymentMethod?: string;
}

export class OrderExecutionClient {
  constructor(private readonly baseUrl: string) {}

  async executeOrder(request: ExecuteOrderRequest): Promise<{ orderId: string; status: string }> {
    try {
      const response = await axios.post(`${this.baseUrl}/orders/execute`, request, { timeout: 5000 });
      return response.data;
    } catch (err) {
      mapUpstreamError(err);
    }
  }
}
