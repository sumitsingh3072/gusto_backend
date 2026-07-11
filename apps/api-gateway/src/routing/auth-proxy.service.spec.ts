import { AuthProxyService } from "./auth-proxy.service";
import { HttpException, ServiceUnavailableException } from "@nestjs/common";
import axios from "axios";

// Just mock the default export, keep the rest of the actual axios module (so isAxiosError works)
jest.mock("axios", () => {
  const original = jest.requireActual("axios");
  return {
    __esModule: true,
    ...original,
    default: jest.fn(),
  };
});

const mockedAxios = axios as unknown as jest.Mock;

describe("AuthProxyService", () => {
  let service: AuthProxyService;

  beforeEach(() => {
    service = new AuthProxyService();
    jest.clearAllMocks();
  });

  it("should forward the request and return data on success", async () => {
    mockedAxios.mockResolvedValueOnce({ data: { success: true } });
    
    const result = await service.forward("POST", "/test", { foo: "bar" });
    
    expect(result).toEqual({ success: true });
    expect(mockedAxios).toHaveBeenCalledWith(expect.objectContaining({
      method: "POST",
      url: expect.stringContaining("/test"),
      data: { foo: "bar" },
    }));
  });

  it("should re-throw HTTP exceptions from upstream", async () => {
    const error: any = new Error("Request failed with status code 401");
    error.isAxiosError = true;
    error.response = {
      status: 401,
      data: { message: "Unauthorized" },
    };
    
    mockedAxios.mockRejectedValue(error);
    
    await expect(service.forward("POST", "/test")).rejects.toThrow(HttpException);
    await expect(service.forward("POST", "/test")).rejects.toMatchObject({
      status: 401,
      response: { message: "Unauthorized" },
    });
  });

  it("should throw ServiceUnavailableException if upstream is unreachable", async () => {
    const error: any = new Error("Network Error");
    error.isAxiosError = true;
    // No error.response for network errors
    
    mockedAxios.mockRejectedValueOnce(error);
    
    await expect(service.forward("POST", "/test")).rejects.toThrow(ServiceUnavailableException);
  });
});
