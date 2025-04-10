import { Request, Response, NextFunction } from "express";
import { useFacilitator } from "x402/verify";
import { getNetworkId, getPaywallHtml, toJsonSafe } from "x402/shared";
import { getUsdcAddressForChain } from "x402/shared/evm";
import { Money, Resource, GlobalConfig, PaymentMiddlewareConfig, moneySchema, PaymentRequirements, settleResponseHeader } from "x402/types"

export function configurePaymentMiddleware(globalConfig: GlobalConfig) {
  const { facilitatorUrl, address, network } = globalConfig;
  const { settle, verify } = useFacilitator(facilitatorUrl);

  return function paymentMiddleware(
    amount: Money,
    config: PaymentMiddlewareConfig
  ) {
    const { description, mimeType, maxTimeoutSeconds, outputSchema, customPaywallHtml, resource } = config;

    const parsedAmount = moneySchema.safeParse(amount);
    if (!parsedAmount.success) {
      throw new Error(
        `Invalid amount (amount: ${amount}). Must be in the form "$3.10", 0.10, "0.001", ${parsedAmount.error}`
      );
    }
    const maxAmountRequired = parsedAmount.data;

    // Express middleware
    return async (req: Request, res: Response, next: NextFunction) => {
      // Use req.originalUrl as the resource if none is provided
      const resourceUrl: Resource = resource || (req.originalUrl as Resource);
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
        outputSchema: outputSchema ?? undefined,
        extra: undefined,
      };

      console.log("Payment middleware checking request:", req.originalUrl);
      console.log("Payment details:", paymentRequirements);

      const payment = req.header("X-PAYMENT");
      const userAgent = req.header("User-Agent") || "";
      const acceptHeader = req.header("Accept") || "";
      const isWebBrowser =
        acceptHeader.includes("text/html") && userAgent.includes("Mozilla");

      if (!payment) {
        console.log("No payment header found, returning 402");
        if (isWebBrowser) {
          const html =
            customPaywallHtml ||
            getPaywallHtml({
              amount: parsedAmount.data,
              paymentRequirements: toJsonSafe(paymentRequirements),
              currentUrl: req.originalUrl,
              testnet: network === "base-sepolia",
            });
          return res.status(402).send(html);
        }
        return res.status(402).json({
          error: "X-PAYMENT header is required",
          paymentRequirements: toJsonSafe(paymentRequirements),
        });
      }

      try {
        const response = await verify(payment, paymentRequirements);
        if (!response.isValid) {
          console.log("Invalid payment:", response.invalidReason);
          return res.status(402).json({
            error: response.invalidReason,
            paymentRequirements: toJsonSafe(paymentRequirements),
          });
        }
      } catch (error) {
        console.log("Error during payment verification:", error);
        return res.status(402).json({
          error,
          paymentRequirements: toJsonSafe(paymentRequirements),
        });
      }

      console.log("Payment verified, proceeding to next middleware or route handler");
      // Proceed to the next middleware or route handler
      await next();

      try {
        const settleResponse = await settle(payment, paymentRequirements);
        const responseHeader = settleResponseHeader(settleResponse);
        res.setHeader("X-PAYMENT-RESPONSE", responseHeader);
      } catch (error) {
        console.log("Settlement failed:", error);
        // If settlement fails and the response hasn't been sent yet, return an error
        if (!res.headersSent) {
          return res.status(402).json({
            error,
            paymentRequirements: toJsonSafe(paymentRequirements),
          });
        }
      }
    };
  }
}
