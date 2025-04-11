import { Address, Chain, Hex, toHex, Transport } from "viem";
import { getNetworkId } from "../../../shared";
import { getVersion } from "../../../shared/evm";
import { authorizationTypes, config, SignerWallet } from "../../../types/shared/evm";
import { ExactEvmPayloadAuthorization, PaymentRequirements } from "../../../types/verify";
/**
 * Signs an EIP-3009 authorization for USDC transfer
 * @param walletClient - The wallet client that will sign the authorization
 * @param params - The authorization parameters
 * @param params.from - The address tokens will be transferred from
 * @param params.to - The address tokens will be transferred to
 * @param params.value - The amount of USDC tokens to transfer (in base units)
 * @param params.validAfter - Unix timestamp after which the authorization becomes valid
 * @param params.validBefore - Unix timestamp before which the authorization is valid
 * @param params.nonce - Random 32-byte nonce to prevent replay attacks
 * @param params.chainId - The chain ID where the USDC contract exists
 * @param params.version - The USDC contract version
 * @param params.usdcAddress - The address of the USDC contract
 * @returns The signature for the authorization
 */
export async function signAuthorization<transport extends Transport, chain extends Chain>(
  walletClient: SignerWallet<chain, transport>,
  { from, to, value, validAfter, validBefore, nonce }: ExactEvmPayloadAuthorization,
  { asset, network }: PaymentRequirements,
): Promise<{ signature: Hex }> {
  const chainId = getNetworkId(network);
  const usdcName = config[chainId].usdcName;
  const version = await getVersion(walletClient);

  const data = {
    account: walletClient.account!,
    types: authorizationTypes,
    domain: {
      name: usdcName,
      version: version,
      chainId: chainId,
      verifyingContract: asset as Address,
    },
    primaryType: "TransferWithAuthorization" as const,
    message: {
      from,
      to,
      value,
      validAfter,
      validBefore,
      nonce: nonce,
    },
  };

  const signature = await walletClient.signTypedData(data);

  return {
    signature,
  };
}

export function createNonce(): Hex {
  return toHex(crypto.getRandomValues(new Uint8Array(32)));
}
