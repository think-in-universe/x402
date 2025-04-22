import { Hex } from "viem";
import { Resource } from "./resource";
import { CreateHeaders } from "../../verify";
import { Money } from "./money";
import { Network } from "./network";

export type FacilitatorConfig = {
  url: Resource;
  createAuthHeaders?: CreateHeaders;
};

export type PaymentMiddlewareConfig = {
  description?: string;
  mimeType?: string;
  maxTimeoutSeconds?: number;
  outputSchema?: object;
  customPaywallHtml?: string;
  resource?: Resource;
};

/**
 * Configuration for a token amount in atomic units
 */
export interface TokenAmount {
  /**
   * The amount in atomic units (e.g. wei for ETH)
   */
  amount: string;
  /**
   * The token configuration
   */
  asset: {
    address: `0x${string}`;
    decimals: number;
    eip712: {
      name: string;
      version: string;
    };
  };
}

/**
 * Configuration for a specific route pattern
 */
export interface RouteConfig {
  /**
   * The price to charge for this route
   * - If a string or number, it's treated as a USDC amount in dollars (e.g. "$0.01")
   * - If a TokenAmount, it's treated as an amount in atomic units for the specified token
   */
  price: Money | TokenAmount;

  /**
   * The blockchain network to charge the payment on
   */
  network: Network;

  /**
   * Additional configuration for this route
   */
  config?: PaymentMiddlewareConfig;
}

export type GlobalConfig = {
  facilitator?: FacilitatorConfig;
  payToAddress: Hex;
  routes: Record<string, RouteConfig> | { price: Money | TokenAmount; network: Network };
};
