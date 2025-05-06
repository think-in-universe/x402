import { Address } from "viem";

export const config: Record<string, ChainConfig> = {
  "84532": {
    usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    usdcName: "USDC",
  },
  "8453": {
    usdcAddress: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
    usdcName: "USD Coin",
  },
};

export type ChainConfig = {
  usdcAddress: Address;
  usdcName: string;
};
