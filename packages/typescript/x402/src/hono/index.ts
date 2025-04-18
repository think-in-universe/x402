import type { MiddlewareHandler } from "hono";
import {
  Money,
  moneySchema,
  PaymentRequirements,
  toJsonSafe,
  settleResponseHeader,
  Resource,
} from "../types";
import { Address } from "viem";
import { getUsdcAddressForChain } from "../shared/evm/usdc";
import { useFacilitator } from "../client";
import { getPaywallHtml } from "../shared/paywall";

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

export function paymentMiddleware(
  amount: Money,
  address: Address,
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
  const parsedAmount = moneySchema.safeParse(amount);
  if (!parsedAmount.success) {
    throw new Error(
      `Invalid amount (amount: ${amount}). Must be in the form "$3.10", 0.10, "0.001", ${parsedAmount.error}`,
    );
  }

  const { verify, settle } = useFacilitator(facilitatorUrl);

  return async (c, next) => {
    let resourceUrl = resource || (c.req.url as Resource);
    const paymentRequirements: PaymentRequirements = {
      scheme: "exact",
      network: testnet ? "base-sepolia" : "base",
      maxAmountRequired: parsedAmount.data.toString(),
      resource: resourceUrl,
      description,
      mimeType,
      payTo: address,
      maxTimeoutSeconds: maxDeadlineSeconds,
      asset: getUsdcAddressForChain(testnet ? 84532 : 8453),
      outputSchema: outputSchema || undefined,
      extra: undefined,
    };
    console.log("Payment middleware checking request:", c.req.url);
    console.log("Payment details:", paymentRequirements);

    const payment = c.req.header("X-PAYMENT");
    const userAgent = c.req.header("User-Agent") || "";
    const acceptHeader = c.req.header("Accept") || "";
    const isWebBrowser = acceptHeader.includes("text/html") && userAgent.includes("Mozilla");

    if (!payment) {
      console.log("No payment header found, returning 402");
      // If it's a browser request, serve the paywall page
      if (isWebBrowser) {
        const html =
          customPaywallHtml ||
          getPaywallHtml({
            amount: parsedAmount.data,
            paymentRequirements: toJsonSafe(paymentRequirements),
            currentUrl: c.req.url,
            testnet,
          });

        return c.html(html, 402);
      }

      // For API requests, return JSON with payment details
      return c.json(
        {
          error: "X-PAYMENT header is required",
          paymentRequirements: toJsonSafe(paymentRequirements),
        },
        402,
      );
    }

    const response = await verify(payment, paymentRequirements);
    if (!response.isValid) {
      console.log("Invalid payment:", response.invalidReason);
      return c.json(
        {
          error: response.invalidReason,
          paymentRequirements: toJsonSafe(paymentRequirements),
        },
        402,
      );
    }

    console.log("Payment verified, proceeding");
    await next();

    try {
      const settleResponse = await settle(payment, paymentRequirements);
      const responseHeader = settleResponseHeader(settleResponse);

      c.header("X-PAYMENT-RESPONSE", responseHeader);
    } catch (error) {
      console.log("Settlement failed:", error);

      c.res = c.json(
        {
          error,
          paymentRequirements: toJsonSafe(paymentRequirements),
        },
        402,
      );
    }
  };
}
