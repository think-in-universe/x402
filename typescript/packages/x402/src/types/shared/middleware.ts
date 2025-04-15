import { Hex } from "viem";
import { Network } from "./network";
import { Resource } from "./resource";

export type GlobalConfig = {
  facilitatorUrl?: Resource;
  address: Hex;
  network: Network;
  auth?: {
    apiKeyId: string;
    apiKeySecret: string;
    verifyPath: `/${string}`;
    settlePath: `/${string}`;
  };
};

export type PaymentMiddlewareConfig = {
  description?: string;
  mimeType?: string;
  maxTimeoutSeconds?: number;
  outputSchema?: object;
  customPaywallHtml?: string;
  resource?: Resource;
  asset?: {
    address: string;
    decimals: number;
    eip712: {
      name: string;
      version: string;
    };
  };
};
