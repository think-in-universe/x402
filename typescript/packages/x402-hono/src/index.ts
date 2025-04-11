import type { MiddlewareHandler } from "hono";
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

/**
 * Enables APIs to be paid for using the x402 payment protocol.
 * 
 * This middleware:
 * 1. Validates payment headers and requirements
 * 2. Serves a paywall page for browser requests
 * 3. Returns JSON payment requirements for API requests
 * 4. Verifies and settles payments
 * 5. Sets appropriate response headers
 * 
 * @param globalConfig - Global configuration for the payment middleware
 * @param globalConfig.facilitatorUrl - URL of the payment facilitator service
 * @param globalConfig.address - Address to receive payments
 * @param globalConfig.network - Network identifier (e.g. 'base-sepolia')
 * 
 * @returns A function that creates a Hono middleware handler for a specific payment amount
 * 
 * @example
 * ```typescript
 * const middleware = configurePaymentMiddleware({
 *   facilitatorUrl: 'https://facilitator.example.com',
 *   address: '0x123...',
 *   network: 'base-sepolia'
 * })(1.0, {
 *   description: 'Access to premium content',
 *   mimeType: 'application/json'
 * });
 * 
 * app.use('/premium', middleware);
 * ```
 */
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

      const payment = c.req.header("X-PAYMENT");
      const userAgent = c.req.header("User-Agent") || "";
      const acceptHeader = c.req.header("Accept") || "";
      const isWebBrowser = acceptHeader.includes("text/html") && userAgent.includes("Mozilla");

      if (!payment) {
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
        return c.json(
          {
            error: response.invalidReason,
            paymentRequirements: toJsonSafe(paymentRequirements),
          },
          402,
        );
      }

      await next();

      try {
        const settleResponse = await settle(payment, paymentRequirements);
        const responseHeader = settleResponseHeader(settleResponse);

        c.header("X-PAYMENT-RESPONSE", responseHeader);
      } catch (error) {

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