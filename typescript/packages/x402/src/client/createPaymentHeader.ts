import { createPaymentHeader as createPaymentHeaderExactEVM } from "../schemes/exact/evm/client.js";
import { SupportedEVMNetworks } from "../types/shared/index.js";
import { SignerWallet } from "../types/shared/evm/index.js";
import { PaymentRequirements } from "../types/verify/index.js";

/**
 * Creates a payment header based on the provided client and payment requirements.
 * 
 * @param client - The signer wallet instance used to create the payment header
 * @param x402Version - The version of the X402 protocol to use
 * @param paymentRequirements - The payment requirements containing scheme and network information
 * @returns A promise that resolves to the created payment header string
 */
export async function createPaymentHeader(
  client: SignerWallet,
  x402Version: number,
  paymentRequirements: PaymentRequirements,
): Promise<string> {
  if (
    paymentRequirements.scheme === "exact" &&
    SupportedEVMNetworks.includes(paymentRequirements.network)
  ) {
    return await createPaymentHeaderExactEVM(client, x402Version, paymentRequirements);
  }

  throw new Error("Unsupported scheme");
}