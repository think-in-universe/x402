import { signPaymentHeader as signPaymentHeaderExactEVM } from "../schemes/exact/evm/client.js";
import { encodePayment } from "../schemes/exact/evm/utils/paymentUtils.js";
import { SupportedEVMNetworks } from "../types/shared/index.js";
import { SignerWallet } from "../types/shared/evm/index.js";
import { PaymentRequirements, UnsignedPaymentPayload } from "../types/verify/index.js";

/**
 * Signs a payment header using the provided client and payment requirements.
 * 
 * @param client - The signer wallet instance used to sign the payment header
 * @param paymentRequirements - The payment requirements containing scheme and network information
 * @param unsignedPaymentHeader - The unsigned payment payload to be signed
 * @returns A promise that resolves to the encoded signed payment header string
 */
export async function signPaymentHeader(
  client: SignerWallet,
  paymentRequirements: PaymentRequirements,
  unsignedPaymentHeader: UnsignedPaymentPayload,
): Promise<string> {
  if (
    paymentRequirements.scheme === "exact" &&
    SupportedEVMNetworks.includes(paymentRequirements.network)
  ) {
    const signedPaymentHeader = await signPaymentHeaderExactEVM(client, paymentRequirements, unsignedPaymentHeader);
    return encodePayment(signedPaymentHeader);
  }

  throw new Error("Unsupported scheme");
}