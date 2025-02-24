import type { Context, Next, MiddlewareHandler } from "hono";
import {
  Money,
  moneySchema,
  PaymentDetails,
  toJsonSafe,
} from "../../shared/types";
import { Address } from "viem";
import { getUsdcAddressForChain } from "../../shared/evm/usdc";
import { settle, verify } from "..";
import { decodePayment } from "../../client/exact/evm/sign";

export function paymentMiddleware(
  amount: Money,
  address: Address,
  description: string = "",
  mimeType: string = "",
  maxDeadlineSeconds: number = 60,
  outputSchema: object | null = null,
  testnet: boolean = true // TODO: default this to false when we're not testing
): MiddlewareHandler {
  const parsedAmount = moneySchema.safeParse(amount);
  if (!parsedAmount.success) {
    throw new Error(
      `Invalid amount (amount: ${amount}). Must be in the form "$3.10", 0.10, "0.001", ${parsedAmount.error}`
    );
  }

  const paymentDetails: PaymentDetails = {
    scheme: "exact",
    networkId: testnet ? "84532" : "8453",
    maxAmountRequired: BigInt(parsedAmount.data * 10 ** 6),
    resource: "http://localhost:4021/joke", // TODO: make this dynamic
    description,
    mimeType,
    payToAddress: address,
    requiredDeadlineSeconds: maxDeadlineSeconds,
    usdcAddress: getUsdcAddressForChain(testnet ? 84532 : 8453),
    outputSchema,
    extra: null,
  };
  return async (c, next) => {
    const payment = c.req.header("X-PAYMENT");
    if (!payment) {
      return Response.json(
        {
          error: "X-PAYMENT header is required",
          paymentDetails: toJsonSafe(paymentDetails),
        },
        { status: 402 }
      );
    }

    const response = await verify(payment, paymentDetails);
    if (!response.isValid) {
      return Response.json(
        {
          error: response.invalidReason,
          paymentDetails: toJsonSafe(paymentDetails),
        },
        { status: 402 }
      );
    }

    await next();

    const settleResponse = await settle(payment, paymentDetails);
    if (!settleResponse.success) {
      return Response.json(
        {
          error: settleResponse.error,
          paymentDetails: toJsonSafe(paymentDetails),
        },
        { status: 402 }
      );
    }
  };
}
