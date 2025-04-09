import { describe, test, expect } from "vitest";
import { PaymentDetails, paymentDetailsSchema } from "../src/types/index.js";
import { toJsonSafe } from "../src/types/index.js";

describe("types conversion", () => {
  test("PaymentNeededDetails serialization", () => {
    const requirements: PaymentRequirements = {
      scheme: "exact",
      network: "base-sepolia",
      maxAmountRequired: "1000",
      resource: "https://api.example.com/resource",
      description: "Test resource",
      mimeType: "application/json",
      outputSchema: undefined,
      payTo: "0x123" as `0x${string}`,
      maxTimeoutSeconds: 30,
      asset: "0x456" as `0x${string}`,
      extra: undefined,
    };

    const json = toJsonSafe(requirements);

    const restored = PaymentRequirementsSchema.parse(json);
    expect(restored).toEqual(requirements);
  });
});
