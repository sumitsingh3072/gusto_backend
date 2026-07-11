import { Injectable, HttpException, ServiceUnavailableException } from "@nestjs/common";
import axios, { isAxiosError } from "axios";
import { env } from "../config/configuration";

@Injectable()
export class AuthProxyService {
  async forward(method: string, path: string, body?: unknown) {
    try {
      const response = await axios({
        method,
        url: env.AUTH_SERVICE_URL + path,
        data: body,
        timeout: 10_000,
      });
      return response.data;
    } catch (error) {
      if (isAxiosError(error)) {
        if (error.response) {
          // Upstream responded with an error status
          throw new HttpException(
            error.response.data,
            error.response.status
          );
        } else {
          // Upstream unreachable (network error, timeout)
          throw new ServiceUnavailableException("Could not reach auth-service");
        }
      }
      // For any non-axios errors that might get thrown (unlikely)
      throw error;
    }
  }
}
