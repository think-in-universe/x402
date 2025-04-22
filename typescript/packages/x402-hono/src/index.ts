import type { Context } from "hono";
import { exact } from "x402/schemes";
import { getNetworkId, getPaywallHtml, toJsonSafe } from "x402/shared";
import { getUsdcAddressForChain } from "x402/shared/evm";
import {
  GlobalConfig,
  moneySchema,
  PaymentPayload,
  PaymentRequirements,
  Resource,
  RouteConfig,
  settleResponseHeader,
  TokenAmount
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
 * @param globalConfig.facilitator - Configuration for the payment facilitator service
 * @param globalConfig.payToAddress - Address to receive payments
 * @param globalConfig.routes - Route configuration for payment amounts
 *
 * @returns A function that creates a Hono middleware handler for a specific payment amount
 *
 * @example
 * ```typescript
 * const middleware = paymentMiddleware({
 *   facilitator: {
 *     url: 'https://facilitator.example.com',
 *     createAuthHeaders: async () => ({ 
 *       verify: { "Authorization": "Bearer token" },
 *       settle: { "Authorization": "Bearer token" }
 *     })
 *   },
 *   payToAddress: '0x123...',
 *   routes: {
 *     '/premium/*': {
 *       price: '$0.01',
 *       network: 'base'
 *     }
 *   }
 * });
 *
 * app.use('/premium', middleware);
 * ```
 */
export function paymentMiddleware(globalConfig: GlobalConfig) {
  const { facilitator, payToAddress, routes } = globalConfig;
  const { verify, settle } = useFacilitator(facilitator);
  const x402Version = 1;

  // If routes is just a price/network object, convert it to a routes config
  const normalizedRoutes = 'price' in routes && 'network' in routes
    ? { '/*': { price: routes.price, network: routes.network, config: {} } } as Record<string, RouteConfig>
    : routes;

  // Pre-compile route patterns to regex and extract verbs
  const routePatterns = Object.entries(normalizedRoutes).map(([pattern, routeConfig]) => {
    // Split pattern into verb and path, defaulting to "*" for verb if not specified
    const [verb, path] = pattern.includes(" ") ? pattern.split(/\s+/) : ["*", pattern];
    if (!path) {
      throw new Error(`Invalid route pattern: ${pattern}`);
    }
    return {
      verb: verb.toUpperCase(),
      pattern: new RegExp(
        `^${path
          .replace(/\*/g, ".*?") // Make wildcard non-greedy and optional
          .replace(/\[([^\]]+)\]/g, "[^/]+")
          .replace(/\//g, "\\/")}$`,
      ),
      config: routeConfig,
    };
  });

  return async function paymentMiddleware(c: Context, next: () => Promise<void>) {
    // Find matching route pattern
    const matchingRoutes = routePatterns.filter(({ pattern, verb }) => {
      const matchesPath = pattern.test(c.req.path);
      const matchesVerb = verb === "*" || verb === c.req.method.toUpperCase();
      return matchesPath && matchesVerb;
    });

    // If no matching routes, proceed
    if (matchingRoutes.length === 0) {
      return next();
    }

    // Use the most specific route (longest path pattern)
    const matchingRoute = matchingRoutes.reduce((a, b) =>
      b.pattern.source.length > a.pattern.source.length ? b : a
    );

    const { price, network } = matchingRoute.config;
    const { description, mimeType, maxTimeoutSeconds, outputSchema, customPaywallHtml, resource } = matchingRoute.config.config || {};

    // Handle USDC amount (string) or token amount (TokenAmount)
    let maxAmountRequired: string;
    let asset: TokenAmount["asset"];

    if (typeof price === "string" || typeof price === "number") {
      // USDC amount in dollars
      const parsedAmount = moneySchema.safeParse(price);
      if (!parsedAmount.success) {
        throw new Error(
          `Invalid price (price: ${price}). Must be in the form "$3.10", 0.10, "0.001", ${parsedAmount.error}`,
        );
      }
      const parsedUsdAmount = parsedAmount.data;
      asset = {
        address: getUsdcAddressForChain(getNetworkId(network)),
        decimals: 6,
        eip712: {
          name: "USDC",
          version: "2",
        },
      };
      maxAmountRequired = (parsedUsdAmount * 10 ** asset.decimals).toString();
    } else {
      // Token amount in atomic units
      maxAmountRequired = price.amount;
      asset = price.asset;
    }

    // Use req.originalUrl as the resource if none is provided
    const resourceUrl: Resource = resource || (c.req.path as Resource);
    const paymentRequirements: PaymentRequirements[] = [
      {
        scheme: "exact",
        network,
        maxAmountRequired,
        resource: resourceUrl,
        description: description ?? "",
        mimeType: mimeType ?? "",
        payTo: payToAddress,
        maxTimeoutSeconds: maxTimeoutSeconds ?? 60,
        asset: asset.address,
        outputSchema: outputSchema ?? undefined,
        extra: {
          name: asset.eip712.name,
          version: asset.eip712.version,
        },
      },
    ];

    const payment = c.req.header("X-PAYMENT");
    const userAgent = c.req.header("User-Agent") || "";
    const acceptHeader = c.req.header("Accept") || "";
    const isWebBrowser = acceptHeader.includes("text/html") && userAgent.includes("Mozilla");

    if (!payment) {
      if (isWebBrowser) {
        const displayAmount = typeof price === "string" || typeof price === "number"
          ? Number(price)
          : Number(price.amount) / 10 ** price.asset.decimals;

        const html =
          customPaywallHtml ||
          getPaywallHtml({
            amount: displayAmount,
            paymentRequirements: toJsonSafe(paymentRequirements) as Parameters<
              typeof getPaywallHtml
            >[0]["paymentRequirements"],
            currentUrl: c.req.path,
            testnet: network === "base-sepolia",
          });
        return c.html(html, 402);
      }
      return c.json(
        {
          error: "X-PAYMENT header is required",
          accepts: toJsonSafe(paymentRequirements),
          x402Version: 1,
        },
        402,
      );
    }

    let decodedPayment: PaymentPayload;
    try {
      decodedPayment = exact.evm.decodePayment(payment);
    } catch (error) {
      return c.json(
        {
          x402Version,
          error: error || "Invalid or malformed payment header",
          accepts: toJsonSafe(paymentRequirements),
        },
        402,
      );
    }

    const selectedPaymentRequirements = paymentRequirements.find(
      value => value.scheme === decodedPayment.scheme && value.network === decodedPayment.network,
    );
    if (!selectedPaymentRequirements) {
      return c.json(
        {
          x402Version,
          error: "Unable to find matching payment requirements",
          accepts: toJsonSafe(paymentRequirements),
        },
        402,
      );
    }

    try {
      const response = await verify(
        {
          ...decodedPayment,
          x402Version,
        },
        selectedPaymentRequirements,
      );
      if (!response.isValid) {
        return c.json(
          {
            x402Version,
            error: response.invalidReason,
            accepts: toJsonSafe(paymentRequirements),
            payerAddress: response.payerAddress,
          },
          402,
        );
      }
    } catch (error) {
      return c.json(
        {
          x402Version,
          error: error || "Failed to verify payment",
          accepts: toJsonSafe(paymentRequirements),
        },
        402,
      );
    }

    await next();

    try {
      const settleResponse = await settle(
        {
          ...decodedPayment,
          x402Version,
        },
        selectedPaymentRequirements,
      );
      const responseHeader = settleResponseHeader(settleResponse);
      c.header("X-PAYMENT-RESPONSE", responseHeader);
    } catch (error) {
      return c.json(
        {
          x402Version,
          error: error || "Failed to settle payment",
          accepts: toJsonSafe(paymentRequirements),
        },
        402,
      );
    }
  };
}

export type { GlobalConfig, Money, Network, PaymentMiddlewareConfig, Resource } from "x402/types";

