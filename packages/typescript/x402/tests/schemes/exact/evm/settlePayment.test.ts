import { expect, test, describe } from "vitest";
import { baseSepolia } from "viem/chains";
import { Address, Hex } from "viem";
import { PaymentDetails, Resource } from "../../../../src/types/index.js";
import { createSignerSepolia } from "../../../../src/shared/evm/wallet.js";
import { createPayment } from "../../../../src/schemes/exact/evm/client.js";
import { getUsdcAddressForChain, getUSDCBalance } from "../../../../src/shared/evm/usdc.js";
import { settle, verify } from "../../../../src/schemes/exact/evm/facilitator.js";

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
