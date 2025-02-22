import { Address, Hex, PublicClient } from "viem";
import { usdcABI as abi } from "./erc20PermitABI";
import { config } from "./config";

export function getUsdcAddress(client: PublicClient): Address {
  return config[client.chain!.id.toString()].usdcAddress as Address;
}

export function getUsdcAddressForChain(chainId: number): Address {
  return config[chainId.toString()].usdcAddress as Address;
}

// Function to get the current nonce for an address
export async function getPermitNonce(
  client: PublicClient,
  owner: Address
): Promise<Hex> {
  const nonce = await client.readContract({
    address: getUsdcAddress(client),
    abi,
    functionName: "nonces",
    args: [owner],
  });

  return nonce as Hex;
}

// Cache for storing the version value
let versionCache: string | null = null;

// Function to get the USDC contract version
export async function getVersion(client: PublicClient): Promise<string> {
  // Return cached version if available
  if (versionCache !== null) {
    return versionCache;
  }

  // Fetch and cache version if not available
  const version = await client.readContract({
    address: getUsdcAddress(client),
    abi,
    functionName: "version",
  });
  versionCache = version as string;
  return versionCache;
}

export async function getUSDCBalance(
  client: PublicClient,
  address: Address
): Promise<bigint> {
  const balance = await client.readContract({
    address: getUsdcAddress(client),
    abi,
    functionName: "balanceOf",
    args: [address],
  });
  return balance as bigint;
}
