import axios from "axios";
import { OptimizedCart } from "@gusto/contracts";
import { mapUpstreamError } from "./map-upstream-error";

export class NotificationClient {
  constructor(private readonly baseUrl: string) {}

  async sendMenuOfTheDay(userId: string, cart: OptimizedCart) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/notify/send`,
        { userId, type: "MENU_OF_THE_DAY", cart },
        { timeout: 5000 },
      );
      return response.data;
    } catch (err) {
      mapUpstreamError(err);
    }
  }
}
