import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { exact } from "x402/schemes";
import { getNetworkId, getPaywallHtml, toJsonSafe } from "x402/shared";
import { getUsdcAddressForChain } from "x402/shared/evm";
import {
  GlobalConfig,
  moneySchema,
  PaymentPayload,
  PaymentRequirements,
  Resource,
  settleResponseHeader,
  TokenAmount,
} from "x402/types";
import { useFacilitator } from "x402/verify";

/**
 * Creates a Next.js middleware handler for x402 payments
 *
 * @param globalConfig - Configuration for the payment middleware
 * @returns A Next.js middleware handler
 *
 * @example
 * ```typescript
 * export const middleware = paymentMiddleware({
 *   facilitator: {
 *     url: process.env.NEXT_PUBLIC_FACILITATOR_URL,
 *     createAuthHeaders: async () => ({
 *       verify: { "Authorization": "Bearer token" },
 *       settle: { "Authorization": "Bearer token" }
 *     })
 *   },
 *   payToAddress: process.env.RESOURCE_WALLET_ADDRESS,
 *   routes: {
 *     '/protected/*': {
 *       price: '$0.01',
 *       network: 'base',
 *       config: {
 *         description: 'Access to protected content'
 *       }
 *     },
 *     '/api/premium/*': {
 *       price: {
 *         amount: '100000',
 *         asset: {
 *           address: '0xabc',
 *           decimals: 18,
 *           eip712: {
 *             name: 'WETH',
 *             version: '1'
 *           }
 *         }
 *       },
 *       network: 'base'
 *     }
 *   }
 * });
 * ```
 */
export function paymentMiddleware(globalConfig: GlobalConfig) {
  const { facilitator, payToAddress, routes } = globalConfig;
  const { verify, settle } = useFacilitator(facilitator);
  const x402Version = 1;

  // Pre-compile route patterns to regex
  const routePatterns = Object.entries(routes).map(([pattern, config]) => ({
    pattern: new RegExp(
      `^${pattern
        .replace(/\*/g, ".*?") // Make wildcard non-greedy and optional
        .replace(/\[([^\]]+)\]/g, "[^/]+")
        .replace(/\//g, "\\/")}$`,
    ),
    config,
  }));

  return async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;

    // Find matching route configuration
    const routeMatch = routePatterns.find(({ pattern }) => pattern.test(pathname));
    if (!routeMatch) {
      return NextResponse.next();
    }

    const { price, network, config = {} } = routeMatch.config;
    const { description, mimeType, maxTimeoutSeconds, outputSchema, customPaywallHtml, resource } =
      config;

    // Handle USDC amount (string) or token amount (TokenAmount)
    let maxAmountRequired: string;
    let asset: TokenAmount["asset"];

    if (typeof price === "string" || typeof price === "number") {
      // USDC amount in dollars
      const parsedAmount = moneySchema.safeParse(price);
      if (!parsedAmount.success) {
        return new NextResponse("Invalid payment configuration", { status: 500 });
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

    const resourceUrl =
      resource || (`${request.nextUrl.protocol}//${request.nextUrl.host}${pathname}` as Resource);
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
        outputSchema: outputSchema || undefined,
        extra: {
          name: asset.eip712.name,
          version: asset.eip712.version,
        },
      },
    ];

    const payment = request.headers.get("X-PAYMENT");
    const userAgent = request.headers.get("User-Agent") || "";
    const acceptHeader = request.headers.get("Accept") || "";
    const isWebBrowser = acceptHeader.includes("text/html") && userAgent.includes("Mozilla");

    if (!payment) {
      if (isWebBrowser) {
        const displayAmount =
          typeof price === "string" || typeof price === "number"
            ? Number(price)
            : Number(price.amount) / 10 ** price.asset.decimals;

        const html =
          customPaywallHtml ||
          getPaywallHtml({
            amount: displayAmount,
            paymentRequirements: toJsonSafe(paymentRequirements) as Parameters<
              typeof getPaywallHtml
            >[0]["paymentRequirements"],
            currentUrl: request.url,
            testnet: network === "base-sepolia",
          });

        return new NextResponse(html, {
          status: 402,
          headers: { "Content-Type": "text/html" },
        });
      }

      return NextResponse.json(
        {
          x402Version,
          error: "X-PAYMENT header is required",
          accepts: toJsonSafe(paymentRequirements),
        },
        { status: 402 },
      );
    }

    let decodedPayment: PaymentPayload;
    try {
      decodedPayment = exact.evm.decodePayment(payment);
    } catch (error) {
      return NextResponse.json(
        {
          x402Version,
          error: error || "Invalid or malformed payment header",
          accepts: toJsonSafe(paymentRequirements),
        },
        { status: 402 },
      );
    }

    const selectedPaymentRequirements = paymentRequirements.find(
      value => value.scheme === decodedPayment.scheme && value.network === decodedPayment.network,
    );
    if (!selectedPaymentRequirements) {
      return NextResponse.json(
        {
          x402Version,
          error: "Unable to find matching payment requirements",
          accepts: toJsonSafe(paymentRequirements),
        },
        { status: 402 },
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
        return NextResponse.json(
          {
            x402Version,
            error: response.invalidReason,
            accepts: toJsonSafe(paymentRequirements),
            payerAddress: response.payerAddress,
          },
          { status: 402 },
        );
      }
    } catch (error) {
      return NextResponse.json(
        {
          x402Version,
          error,
          accepts: toJsonSafe(paymentRequirements),
        },
        { status: 402 },
      );
    }

    // Let the request proceed
    const response = NextResponse.next();

    try {
      const settleResponse = await settle(
        {
          ...decodedPayment,
          x402Version,
        },
        selectedPaymentRequirements,
      );
      const responseHeader = settleResponseHeader(settleResponse);
      response.headers.set("X-PAYMENT-RESPONSE", responseHeader);
    } catch (error) {
      return NextResponse.json(
        {
          x402Version,
          error,
          accepts: toJsonSafe(paymentRequirements),
        },
        { status: 402 },
      );
    }

    return response;
  };
}

export type { GlobalConfig, Money, Network, PaymentMiddlewareConfig, Resource } from "x402/types";
