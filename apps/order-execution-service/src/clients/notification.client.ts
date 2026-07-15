import axios from "axios";

export class NotificationClient {
  constructor(private readonly baseUrl: string) {}

  requestConfirmation(userId: string, orderId: string) {
    return axios.post(`${this.baseUrl}/notify/send`, { userId, type: "CONFIRM_PAYMENT", orderId }, { timeout: 5000 }).then((r) => r.data);
  }

  pushDeliveryStatus(userId: string, orderId: string, status: string) {
    return axios.post(`${this.baseUrl}/notify/send`, { userId, type: "ORDER_STATUS", orderId, status }, { timeout: 5000 }).then((r) => r.data);
  }
}
