import axios from "axios";

export class NotificationClient {
  constructor(private readonly baseUrl: string) {}

  sendMenuOfTheDay(userId: string, cart: unknown) {
    return axios.post(`${this.baseUrl}/notify/send`, { userId, type: "MENU_OF_THE_DAY", cart }).then((r) => r.data);
  }
}
