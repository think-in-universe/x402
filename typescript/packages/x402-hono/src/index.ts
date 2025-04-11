import type { MiddlewareHandler } from "hono";
import { Address } from "viem";
import { getNetworkId, getPaywallHtml, toJsonSafe } from "x402/shared";
import { getUsdcAddressForChain } from "x402/shared/evm";
import {
  GlobalConfig,
  Money,
  moneySchema,
  PaymentMiddlewareConfig,
  PaymentRequirements,
  Resource,
  settleResponseHeader,
} from "x402/types";
import { useFacilitator } from "x402/verify";

export function configurePaymentMiddleware(globalConfig: GlobalConfig) {
  const { facilitatorUrl, address, network } = globalConfig;
  const { verify, settle } = useFacilitator(facilitatorUrl);

  return function paymentMiddleware(amount: Money, config: PaymentMiddlewareConfig = {}): MiddlewareHandler {
    const { description, mimeType, maxTimeoutSeconds, outputSchema, customPaywallHtml, resource } = config;

    const parsedAmount = moneySchema.safeParse(amount);
    if (!parsedAmount.success) {
      throw new Error(
        `Invalid amount (amount: ${amount}). Must be in the form "$3.10", 0.10, "0.001", ${parsedAmount.error}`,
      );
    }
    const parsedUsdAmount = parsedAmount.data;
    const maxAmountRequired = parsedUsdAmount * 10 ** 6; // TODO: Determine asset, get decimals, and convert to atomic amount


    return async (c, next) => {
      let resourceUrl = resource || (c.req.url as Resource);
      const paymentRequirements: PaymentRequirements = {
        scheme: "exact",
        network,
        maxAmountRequired: maxAmountRequired.toString(),
        resource: resourceUrl,
        description: description ?? "",
        mimeType: mimeType ?? "",
        payTo: address,
        maxTimeoutSeconds: maxTimeoutSeconds ?? 60,
        asset: getUsdcAddressForChain(getNetworkId(network)),
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
              testnet: network == 'base-sepolia',
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
}