import { TokenVaultService } from "./token-vault.service";

describe("TokenVaultService", () => {
  const vault = new TokenVaultService();

  it("round-trips a token through encrypt/decrypt", () => {
    const raw = "swiggy-access-token-abc123";
    const encrypted = vault.encrypt(raw);

    expect(encrypted).not.toEqual(raw);
    expect(vault.decrypt(encrypted)).toEqual(raw);
  });

  it("produces a different ciphertext each time (random IV)", () => {
    const raw = "same-plaintext";
    const first = vault.encrypt(raw);
    const second = vault.encrypt(raw);

    expect(first).not.toEqual(second);
    expect(vault.decrypt(first)).toEqual(raw);
    expect(vault.decrypt(second)).toEqual(raw);
  });

  it("rejects a tampered ciphertext instead of returning garbage", () => {
    const encrypted = vault.encrypt("sensitive-token");
    const [iv, authTag, ciphertext] = encrypted.split(".");
    const tamperedCiphertext = Buffer.from(ciphertext, "base64");
    tamperedCiphertext[0] ^= 0xff;
    const tampered = [iv, authTag, tamperedCiphertext.toString("base64")].join(".");

    expect(() => vault.decrypt(tampered)).toThrow();
  });

  it("rejects a malformed encrypted string", () => {
    expect(() => vault.decrypt("not-the-expected-format")).toThrow(/Malformed encrypted token/);
  });

  it("round-trips an empty-string plaintext instead of misclassifying it as malformed (KNOWN_ISSUES.md item 29)", () => {
    const encrypted = vault.encrypt("");
    expect(vault.decrypt(encrypted)).toEqual("");
  });
});
