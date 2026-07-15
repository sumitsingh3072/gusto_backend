import { NotFoundException } from "@nestjs/common";
import { ContactPreferenceService } from "./contact-preference.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("ContactPreferenceService", () => {
  let prisma: { contactPreference: { upsert: jest.Mock; findUnique: jest.Mock; update: jest.Mock } };
  let service: ContactPreferenceService;

  beforeEach(() => {
    prisma = {
      contactPreference: { upsert: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    };
    service = new ContactPreferenceService(prisma as unknown as PrismaService);
  });

  describe("upsert", () => {
    it("upserts by userId", async () => {
      const row = { userId: "user-1", email: "a@b.com" };
      prisma.contactPreference.upsert.mockResolvedValue(row);

      const result = await service.upsert("user-1", { email: "a@b.com" });

      expect(prisma.contactPreference.upsert).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        create: { userId: "user-1", email: "a@b.com" },
        update: { email: "a@b.com" },
      });
      expect(result).toBe(row);
    });
  });

  describe("get", () => {
    it("returns the row", async () => {
      const row = { userId: "user-1" };
      prisma.contactPreference.findUnique.mockResolvedValue(row);
      await expect(service.get("user-1")).resolves.toBe(row);
    });

    it("404s for an unknown user", async () => {
      prisma.contactPreference.findUnique.mockResolvedValue(null);
      await expect(service.get("ghost")).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("findOrNull", () => {
    it("returns null without throwing for an unknown user", async () => {
      prisma.contactPreference.findUnique.mockResolvedValue(null);
      await expect(service.findOrNull("ghost")).resolves.toBeNull();
    });
  });

  describe("setPushEndpointArn", () => {
    it("updates the cached endpoint arn", async () => {
      prisma.contactPreference.update.mockResolvedValue({ userId: "user-1", pushEndpointArn: "arn:aws:sns:1" });
      await service.setPushEndpointArn("user-1", "arn:aws:sns:1");
      expect(prisma.contactPreference.update).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        data: { pushEndpointArn: "arn:aws:sns:1" },
      });
    });
  });
});
