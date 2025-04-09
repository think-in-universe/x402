import { expect, test, describe } from "vitest";
import { PaymentRequirements, Resource } from "../../../../src/types";
import { baseSepolia } from "viem/chains";
import { createSignerSepolia } from "../../../../src/shared/evm/wallet";
import { Address, Hex } from "viem";
import { createPayment } from "../../../../src/schemes/exact/evm/client";
import { getUsdcAddressForChain, getUSDCBalance } from "../../../../src/shared/evm/usdc";
import { settle, verify } from "../../../../src/schemes/exact/evm/facilitator";

describe("settlePayment", () => {
  const wallet = createSignerSepolia(process.env.PRIVATE_KEY as Hex);
  const facilitatorWallet = createSignerSepolia(process.env.FACILITATOR_WALLET_PRIVATE_KEY as Hex);
  const resourceAddress = process.env.RESOURCE_WALLET_ADDRESS as Address;

  test("happy path", async () => {
    const initialBalance = await getUSDCBalance(wallet, resourceAddress);

    const paymentRequirements: PaymentRequirements = {
      scheme: "exact",
      network: "base-sepolia",
      maxAmountRequired: "10000", // 0.01 USDC
      resource: "https://example.com" as Resource,
      description: "example",
      mimeType: "text/plain",
      payTo: resourceAddress,
      maxTimeoutSeconds: 10,
      asset: getUsdcAddressForChain(baseSepolia.id),
      outputSchema: undefined,
      extra: undefined,
    };
    const payment = await createPayment(wallet, paymentRequirements);
    const valid = await verify(wallet, payment, paymentRequirements);
    expect(valid.isValid).toBe(true);
    const result = await settle(facilitatorWallet, payment, paymentRequirements);
    expect(result.success).toBe(true);
    const finalBalance = await getUSDCBalance(wallet, resourceAddress);
    expect(finalBalance).toBe(initialBalance + BigInt(paymentRequirements.maxAmountRequired));
  });
}, 10000);
