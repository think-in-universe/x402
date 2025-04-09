import { EvmNetworkToChainId, Network } from "../types/shared";

export function getNetworkId(network: Network): number {
  if (EvmNetworkToChainId.has(network)) {
    return EvmNetworkToChainId.get(network)!;
  }
  // TODO: Solana
  throw new Error(`Unsupported network: ${network}`);
}
