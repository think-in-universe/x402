import { PaymentRequirementsSchema } from "x402/types";
import { evm } from "x402/types";
import { createPaymentHeader } from "x402/client";

export function fetchWithPayment(
  fetch: typeof globalThis.fetch,
  walletClient: typeof evm.SignerWallet,
  maxValue: bigint = BigInt(0.1 * 10 ** 6), // Default to 0.10 USDC
) {
  return async (input: RequestInfo, init?: RequestInit) => {
    const response = await fetch(input, init);

    if (response.status !== 402) {
      return response;
    }

    try {
      const { paymentRequirements } = await response.json() as { paymentRequirements: unknown };
      const parsed = PaymentRequirementsSchema.parse(paymentRequirements);
      if (BigInt(parsed.maxAmountRequired) > maxValue) {
        throw new Error("Payment amount exceeds maximum allowed");
      }

      const paymentHeader = await createPaymentHeader(walletClient, parsed);

      if (!init) {
        throw new Error("Missing fetch request configuration");
      }

      if ((init as any).__is402Retry) {
        throw new Error("Payment already attempted");
      }

      const newInit = {
        ...init,
        headers: {
          ...(init.headers || {}),
          "X-PAYMENT": paymentHeader,
          "Access-Control-Expose-Headers": "X-PAYMENT-RESPONSE",
        },
        __is402Retry: true,
      };

      const secondResponse = await fetch(input, newInit);
      return secondResponse;
    } catch (paymentError) {
      throw paymentError;
    }
  };
}