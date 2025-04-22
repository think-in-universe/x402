import { Address } from "viem";
import { paymentMiddleware, Network, Resource } from "x402-next";

export const middleware = paymentMiddleware({
  facilitator: {
    url: process.env.NEXT_PUBLIC_FACILITATOR_URL as Resource,
  },
  payToAddress: process.env.RESOURCE_WALLET_ADDRESS as Address,
  routes: {
    "/protected": {
      price: "$0.01",
      network: process.env.NETWORK as Network,
      config: {
        description: "Access to protected content",
      },
    },
  },
});

// Configure which paths the middleware should run on
export const config = {
  matcher: ["/protected/:path*"],
};
