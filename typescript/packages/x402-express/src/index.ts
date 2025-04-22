import { Request, Response, NextFunction, RequestHandler } from "express";
import { useFacilitator, CreateHeaders } from "x402/verify";
import { getNetworkId, getPaywallHtml, toJsonSafe } from "x402/shared";
import { exact } from "x402/schemes";
import { getUsdcAddressForChain } from "x402/shared/evm";
import {
  Money,
  FacilitatorConfig,
  GlobalConfig,
  PaymentMiddlewareConfig,
  Resource,
  moneySchema,
  PaymentRequirements,
  PaymentPayload,
  settleResponseHeader,
  Network,
  TokenAmount,
  RouteConfig,
} from "x402/types";

/**
 * Creates a payment middleware factory for Express
 * 
 * @param config - The configuration for the payment middleware
 * @returns An Express middleware handler
 * 
 * @example
 * ```typescript
 * // Full configuration with specific routes
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
 *     '/weather/*': {
 *       price: '$0.001', // USDC amount in dollars
 *       config: {
 *         description: 'Access to weather data'
 *       }
 *     }
 *   }
 * });
 * 
 * // Simple configuration with a single price for all routes
 * const middleware = paymentMiddleware({
 *   facilitator: {
 *     url: 'https://facilitator.example.com'
 *   },
 *   payToAddress: '0x123...',
 *   routes: {
 *     price: '$0.01',
 *     network: 'base'
 *   }
 * });
 * ```
 */
export function paymentMiddleware(globalConfig: GlobalConfig) {
  const { facilitator, payToAddress, routes } = globalConfig;
  const { verify, settle } = useFacilitator(facilitator);
  const x402Version = 1;

  // If routes is just a price/network object, convert it to a routes config
  const normalizedRoutes = 'price' in routes && 'network' in routes
    ? { '/*': { price: routes.price, network: routes.network } } as Record<string, RouteConfig>
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

  return async function paymentMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    // Find matching route pattern
    const matchingRoutes = routePatterns.filter(({ pattern, verb }) => {
      const matchesPath = pattern.test(req.originalUrl);
      const matchesVerb = verb === "*" || verb === req.method.toUpperCase();
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

    const { price, network, config = {} } = matchingRoute.config;
    const { description, mimeType, maxTimeoutSeconds, outputSchema, customPaywallHtml, resource } = config;

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
    const resourceUrl: Resource = resource || (req.originalUrl as Resource);
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

    const payment = req.header("X-PAYMENT");
    const userAgent = req.header("User-Agent") || "";
    const acceptHeader = req.header("Accept") || "";
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
            currentUrl: req.originalUrl,
            testnet: network === "base-sepolia",
          });
        res.status(402).send(html);
        return;
      }
      res.status(402).json({
        x402Version,
        error: "X-PAYMENT header is required",
        accepts: toJsonSafe(paymentRequirements),
      });
      return;
    }

    let decodedPayment: PaymentPayload;
    try {
      decodedPayment = exact.evm.decodePayment(payment);
    } catch (error) {
      res.status(402).json({
        x402Version,
        error: error || "Invalid or malformed payment header",
        accepts: toJsonSafe(paymentRequirements),
      });
      return;
    }

    const selectedPaymentRequirements = paymentRequirements.find(
      value => value.scheme === decodedPayment.scheme && value.network === decodedPayment.network,
    );
    if (!selectedPaymentRequirements) {
      res.status(402).json({
        x402Version,
        error: "Unable to find matching payment requirements",
        accepts: toJsonSafe(paymentRequirements),
      });
      return;
    }

    try {
      const response = await verify(decodedPayment, selectedPaymentRequirements);
      if (!response.isValid) {
        res.status(402).json({
          x402Version,
          error: response.invalidReason,
          accepts: toJsonSafe(paymentRequirements),
          payerAddress: response.payerAddress,
        });
        return;
      }
    } catch (error) {
      res.status(402).json({
        x402Version,
        error,
        accepts: toJsonSafe(paymentRequirements),
      });
      return;
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    type EndArgs =
      | [cb?: () => void]
      | [chunk: any, cb?: () => void]
      | [chunk: any, encoding: BufferEncoding, cb?: () => void];
    /* eslint-enable @typescript-eslint/no-explicit-any */

    const originalEnd = res.end.bind(res);
    let endArgs: EndArgs | null = null;

    res.end = function (...args: EndArgs) {
      endArgs = args;
      return res; // maintain correct return type
    };

    // Proceed to the next middleware or route handler
    await next();

    try {
      const settleResponse = await settle(decodedPayment, selectedPaymentRequirements);
      const responseHeader = settleResponseHeader(settleResponse);
      res.setHeader("X-PAYMENT-RESPONSE", responseHeader);
    } catch (error) {
      // If settlement fails and the response hasn't been sent yet, return an error
      if (!res.headersSent) {
        res.status(402).json({
          x402Version,
          error,
          accepts: toJsonSafe(paymentRequirements),
        });
        return;
      }
    } finally {
      res.end = originalEnd;
      if (endArgs) {
        originalEnd(...(endArgs as Parameters<typeof res.end>));
      }
    }
  };
}

/**
 * Default configuration for accepting USDC payments
 */
export const acceptsUSDCMiddleware = (config: Omit<GlobalConfig, "routes">, network: Network): RequestHandler => {
  return paymentMiddleware({
    ...config,
    routes: {
      "/*": {
        price: "$0.01",
        network,
        config: {
          description: "Access to content",
        },
      },
    },
  });
};

export type { Resource, Network, GlobalConfig, PaymentMiddlewareConfig, Money } from "x402/types";
