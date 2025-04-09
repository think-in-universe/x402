import { Address } from "viem";
import { preparePaymentHeader as preparePaymentHeaderExactEVM } from "../schemes/exact/evm/client";
import { SupportedEVMNetworks } from "../types/shared";
import { PaymentRequirements, UnsignedPaymentPayload } from "../types/verify";

export function preparePaymentHeader(
  from: Address,
  paymentRequirements: PaymentRequirements,
): UnsignedPaymentPayload {
  if (
    paymentRequirements.scheme === "exact" &&
    SupportedEVMNetworks.includes(paymentRequirements.network)
  ) {
    return preparePaymentHeaderExactEVM(from, paymentRequirements);
  }

  throw new Error("Unsupported scheme");
}