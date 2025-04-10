import { expect, test, describe } from "vitest";
import { createPayment } from "../../../../src/schemes/exact/evm/client";
import { verify } from "../../../../src/schemes/exact/evm/facilitator";
import { Resource, PaymentRequirements } from "../../../../src/types";
import { getUsdcAddressForChain } from "../../../../src/shared/evm/usdc";
import { createSignerSepolia, createClientSepolia } from "../../../../src/shared/evm/wallet";
import { Address, Hex } from "viem";

describe("sign and recover", () => {
  const wallet = createSignerSepolia(process.env.PRIVATE_KEY as Hex);
  const client = createClientSepolia();

  test("happy path sign and recover", async () => {
    const paymentRequirements: PaymentRequirements = {
      scheme: "exact",
      network: "base-sepolia",
      maxAmountRequired: "1",
      resource: "https://example.com" as Resource,
      description: "example",
      mimeType: "text/plain",
      outputSchema: undefined,
      payTo: "0x0000000000000000000000000000000000000000" as Address,
      maxTimeoutSeconds: 30,
      asset: getUsdcAddressForChain(wallet.chain?.id as number),
      extra: undefined,
    };

    const payment = await createPayment(wallet, paymentRequirements);

    console.log(payment);

    const valid = await verify(client, payment, paymentRequirements);
    console.log("valid", valid);
    expect(valid.isValid).toBe(true);
  });

  test("rejects incompatible payload version", async () => {
    const paymentRequirements: PaymentRequirements = {
      scheme: "exact",
      network: "base-sepolia",
      maxAmountRequired: "1",
      resource: "https://example.com" as Resource,
      description: "example",
      mimeType: "text/plain",
      payTo: "0x0000000000000000000000000000000000000000" as Address,
      outputSchema: undefined,
      maxTimeoutSeconds: 60,
      asset: getUsdcAddressForChain(wallet.chain?.id as number),
      extra: undefined,
    };

    const payment = await createPayment(
      wallet,
      { ...paymentRequirements, scheme: "invalid" as any }, // Create payment with v1 but verify against v2
    );

    const valid = await verify(wallet, payment, paymentRequirements);
    expect(valid.isValid).toBe(false);
    expect(valid.invalidReason).toContain(
      "Incompatible payload scheme. payload: invalid, paymentRequirements: exact, supported: exact",
    );
  });

  test("rejects invalid USDC address", async () => {
    const paymentRequirements: PaymentRequirements = {
      scheme: "exact",
      network: "base-sepolia",
      maxAmountRequired: "1",
      resource: "https://example.com" as Resource,
      description: "example",
      mimeType: "text/plain",
      payTo: "0x0000000000000000000000000000000000000000" as Address,
      maxTimeoutSeconds: 60,
      outputSchema: undefined,
      asset: "0x1234567890123456789012345678901234567890" as Address, // Wrong address
      extra: undefined,
    };

    const payment = await createPayment(wallet, paymentRequirements);

    const valid = await verify(wallet, payment, paymentRequirements);
    expect(valid.isValid).toBe(false);
    expect(valid.invalidReason).toBe("invalid_scheme");
  });

  test("rejects invalid permit signature", async () => {
    const paymentRequirements: PaymentRequirements = {
      scheme: "exact",
      network: "base-sepolia",
      maxAmountRequired: "1",
      resource: "https://example.com" as Resource,
      description: "example",
      mimeType: "text/plain",
      payTo: "0x0000000000000000000000000000000000000000" as Address,
      maxTimeoutSeconds: 60,
      asset: getUsdcAddressForChain(wallet.chain?.id as number),
      outputSchema: undefined,
      extra: undefined,
    };

    const payment = await createPayment(wallet, paymentRequirements);

    // Corrupt the signature
    const corruptedPayment = {
      ...payment,
      payload: {
        ...payment.payload,
        signature:
          "0xf3f303070867dd381e0859de4ec39fb590c25ead665eaa3c3053d4aacb46d23a0d862ce6256d01549196317e120dd685efa4d1777f0849f4b6a05a4609f319cc1c" as `0x${string}`,
      },
    };

    const valid = await verify(wallet, corruptedPayment, paymentRequirements);
    expect(valid.isValid).toBe(false);
    expect(valid.invalidReason).toBe("invalid_scheme");
  });

  test("rejects expired deadline", async () => {
    const paymentRequirements: PaymentRequirements = {
      scheme: "exact",
      network: "base-sepolia",
      maxAmountRequired: "1",
      resource: "https://example.com" as Resource,
      description: "example",
      mimeType: "text/plain",
      payTo: "0x0000000000000000000000000000000000000000" as Address,
      maxTimeoutSeconds: 1,
      asset: getUsdcAddressForChain(wallet.chain?.id as number),
      outputSchema: undefined,
      extra: undefined,
    };

    const payment = await createPayment(wallet, paymentRequirements);

    const valid = await verify(wallet, payment, paymentRequirements);
    expect(valid.isValid).toBe(false);
    expect(valid.invalidReason).toBe("invalid_scheme");
  });

  test("rejects insufficient funds", async () => {
    const paymentRequirements: PaymentRequirements = {
      scheme: "exact",
      network: "base-sepolia",
      maxAmountRequired: "99999999999", // Very large amount, greater than balance of wallet
      resource: "https://example.com" as Resource,
      description: "example",
      mimeType: "text/plain",
      payTo: "0x0000000000000000000000000000000000000000" as Address,
      maxTimeoutSeconds: 10,
      asset: getUsdcAddressForChain(wallet.chain?.id),
      outputSchema: undefined,
      extra: undefined,
    };

    const payment = await createPayment(wallet, paymentRequirements);

    const valid = await verify(wallet, payment, paymentRequirements);
    expect(valid.isValid).toBe(false);
    expect(valid.invalidReason).toBe("insufficient_funds");
  });

  test("rejects insufficient value in payload", async () => {
    const paymentRequirements: PaymentRequirements = {
      scheme: "exact",
      network: "base-sepolia",
      maxAmountRequired: "2",
      resource: "https://example.com" as Resource,
      description: "example",
      mimeType: "text/plain",
      payTo: "0x0000000000000000000000000000000000000000" as Address,
      maxTimeoutSeconds: 10,
      asset: getUsdcAddressForChain(wallet.chain?.id as number),
      outputSchema: undefined,
      extra: undefined,
    };

    const payment = await createPayment(
      wallet,
      { ...paymentRequirements, maxAmountRequired: "1" }, // Create with lower amount
    );

    const valid = await verify(wallet, payment, paymentRequirements);
    expect(valid.isValid).toBe(false);
    expect(valid.invalidReason).toBe("invalid_scheme");
  });
});
