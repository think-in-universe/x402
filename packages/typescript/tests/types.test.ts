import { describe, test, expect } from "vitest";

import {
  AuthorizationParameters,
  PaymentNeededDetails,
  PayloadV1,
  PaymentPayloadV1,
} from "../src/shared/types";

import {
  paymentNeededDetailsToJsonSafe,
  paymentNeededDetailsFromObj,
  authorizationParametersToJsonSafe,
  authorizationParametersFromObj,
  payloadV1ToJsonSafe,
  payloadV1FromObj,
  paymentPayloadV1ToJsonSafe,
  paymentPayloadV1FromObj,
} from "../src/shared/types/convert";

describe("types conversion", () => {
  test("PaymentNeededDetails serialization", () => {
    const details: PaymentNeededDetails = {
      version: 1,
      maxAmountRequired: BigInt(1000),
      resource: "https://api.example.com/resource",
      description: "Test resource",
      mimeType: "application/json",
      outputSchema: null,
      resourceAddress: "0x123" as `0x${string}`,
      requiredDeadlineSeconds: 30,
      usdcAddress: "0x456" as `0x${string}`,
      chainId: 1,
    };

    const jsonObj = paymentNeededDetailsToJsonSafe(details);
    const jsonString = JSON.stringify(jsonObj);
    const parsedJson = JSON.parse(jsonString);
    const restored = paymentNeededDetailsFromObj(parsedJson);
    expect(restored).toEqual(details);
  });

  test("AuthorizationParameters serialization", () => {
    const params: AuthorizationParameters = {
      from: "0x123" as `0x${string}`,
      to: "0x456" as `0x${string}`,
      value: BigInt(1000),
      validAfter: BigInt(1000),
      validBefore: BigInt(2000),
      nonce: "0x123" as `0x${string}`,
      chainId: 1,
      version: "1",
      usdcAddress: "0x456" as `0x${string}`,
    };

    const jsonObj = authorizationParametersToJsonSafe(params);
    const jsonString = JSON.stringify(jsonObj);
    const parsedJson = JSON.parse(jsonString);
    const restored = authorizationParametersFromObj(parsedJson);
    expect(restored).toEqual(params);
  });

  test("PayloadV1 serialization", () => {
    const payload: PayloadV1 = {
      signature: "0xabc" as `0x${string}`,
      params: {
        from: "0x123" as `0x${string}`,
        to: "0x456" as `0x${string}`,
        value: BigInt(1000),
        validAfter: BigInt(1000),
        validBefore: BigInt(2000),
        nonce: "0x123" as `0x${string}`,
        chainId: 1,
        version: "1",
        usdcAddress: "0x456" as `0x${string}`,
      },
    };

    const jsonObj = payloadV1ToJsonSafe(payload);
    const jsonString = JSON.stringify(jsonObj);
    const parsedJson = JSON.parse(jsonString);
    const restored = payloadV1FromObj(parsedJson);
    expect(restored).toEqual(payload);
  });

  test("PaymentPayloadV1 serialization", () => {
    const paymentPayload: PaymentPayloadV1 = {
      version: 1,
      resource: "https://api.example.com/resource",
      payload: {
        signature: "0xabc" as `0x${string}`,
        params: {
          from: "0x123" as `0x${string}`,
          to: "0x456" as `0x${string}`,
          value: BigInt(1000),
          validAfter: BigInt(1000),
          validBefore: BigInt(2000),
          nonce: "0x123" as `0x${string}`,
          chainId: 1,
          version: "1",
          usdcAddress: "0x456" as `0x${string}`,
        },
      },
    };

    const jsonObj = paymentPayloadV1ToJsonSafe(paymentPayload);
    const jsonString = JSON.stringify(jsonObj);
    const parsedJson = JSON.parse(jsonString);
    const restored = paymentPayloadV1FromObj(parsedJson);
    expect(restored).toEqual(paymentPayload);
  });
});
