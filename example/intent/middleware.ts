import type { MiddlewareHandler } from "hono";
import {
  Money,
  moneySchema,
  PaymentDetails,
  toJsonSafe,
  settleResponseHeader,
  Resource,
} from "x402/types";
import { Address } from "viem";
import { evm } from "x402/shared";
import { useFacilitator } from "x402/client";
// import { getPaywallHtml } from "x402/paywall";
// export { getPaywallHtml } from "x402/paywall";
import { BASE_USDC_ASSET_ID } from "./constants";
import { getDepositAddress, getDepositedBalance } from "./intents";

interface PaymentMiddlewareOptions {
  description?: string;
  mimeType?: string;
  maxDeadlineSeconds?: number;
  outputSchema?: object | null;
  facilitatorUrl?: string;
  testnet?: boolean;
  customPaywallHtml?: string;
  resource?: Resource | null;
}

export function intentsPaymentMiddleware(
  {
    description = "",
    mimeType = "",
    maxDeadlineSeconds = 60,
    outputSchema = null,
    facilitatorUrl = "https://x402.org/facilitator",
    testnet = true,
    customPaywallHtml = "",
    resource = null,
  }: PaymentMiddlewareOptions = {},
): MiddlewareHandler {
  const { verify, settle } = useFacilitator(facilitatorUrl);

  return async (c, next) => {
    const body = await c.req.json();
    const method = body.method;

    if (method !== "publish_intent") {
      console.log("Not publish intent. Skip.");
      await next();
      return;
    }

    const params = body.params;

    const payload = params[0]?.signed_data?.payload;
    const parsedPayload = JSON.parse(payload);
    const signerId = parsedPayload.signer_id;
    const intents = parsedPayload.intents;
    const requiredBalance = intents
        .filter((intent: any) => intent.intent === "token_diff")
        .reduce((acc: bigint, intent: any) => {
          return acc + BigInt(intent.diff[BASE_USDC_ASSET_ID] ?? 0);
        }, 0n);
      
    const [depositAddress, depositedBalance] = await Promise.all([
      getDepositAddress(signerId),
      getDepositedBalance(signerId)
    ]);

    console.log("address and balance:", {
      depositAddress,
      requiredBalance,
      depositedBalance
    });

    const amount = (-requiredBalance) - BigInt(depositedBalance);
    if (amount <= 0) {
      console.log("Enough balance. Skip.");
      await next();
      return;
    }

    let resourceUrl = resource || (c.req.url as Resource);
    const paymentDetails: PaymentDetails = {
      scheme: "exact",
      networkId: testnet ? "84532" : "8453",
      maxAmountRequired: amount,
      resource: resourceUrl,
      description,
      mimeType,
      payToAddress: depositAddress.address,
      requiredDeadlineSeconds: maxDeadlineSeconds,
      usdcAddress: evm.usdc.getUsdcAddressForChain(testnet ? 84532 : 8453),
      outputSchema,
      extra: null,
    };
    console.log("Payment middleware checking request:", c.req.url);
    console.log("Payment details:", paymentDetails);

    const payment = c.req.header("X-PAYMENT");
    const userAgent = c.req.header("User-Agent") || "";
    const acceptHeader = c.req.header("Accept") || "";
    const isWebBrowser = acceptHeader.includes("text/html") && userAgent.includes("Mozilla");

    if (!payment) {
      console.log("No payment header found, returning 402");
      // For API requests, return JSON with payment details
      return c.json(
        {
          error: "X-PAYMENT header is required",
          paymentDetails: toJsonSafe(paymentDetails),
        },
        402,
      );
    }

    const response = await verify(payment, paymentDetails);
    if (!response.isValid) {
      console.log("Invalid payment:", response.invalidReason);
      return c.json(
        {
          error: response.invalidReason,
          paymentDetails: toJsonSafe(paymentDetails),
        },
        402,
      );
    }

    try {
      const settleResponse = await settle(payment, paymentDetails);
      const responseHeader = settleResponseHeader(settleResponse);

      c.header("X-PAYMENT-RESPONSE", responseHeader);

      // TODO: wait until all recent deposits are confirmed
      await new Promise(resolve => setTimeout(resolve, 20000));
    } catch (error) {
      console.log("Settlement failed:", error);

      c.res = c.json(
        {
          error,
          paymentDetails: toJsonSafe(paymentDetails),
        },
        402,
      );
    }

    console.log("Payment settled. Proceeding...");
    await next();
  };
}
