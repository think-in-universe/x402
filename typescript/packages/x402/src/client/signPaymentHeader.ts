import { signPaymentHeader as signPaymentHeaderExactEVM } from "../schemes/exact/evm/client";
import { encodePayment } from "../schemes/exact/evm/utils/paymentUtils";
import { SupportedEVMNetworks } from "../types/shared";
import { SignerWallet } from "../types/shared/evm";
import { PaymentRequirements, UnsignedPaymentPayload } from "../types/verify";

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