import { z } from "zod";

export const NetworkSchema = z.enum(["base-sepolia", "base"]);
export type Network = z.infer<typeof NetworkSchema>;

export const SupportedEVMNetworks: Network[] = ["base-sepolia", "base"];

const evmNetworkToChainId = new Map<Network, number>([
  ["base-sepolia", 84532],
  ["base", 8453],
]);

export function getNetworkId(network: Network): number {
  if (evmNetworkToChainId.has(network)) {
    return evmNetworkToChainId.get(network)!;
  }
  // TODO: Solana
  throw new Error(`Unsupported network: ${network}`);
}
