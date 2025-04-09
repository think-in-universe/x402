import { Address, Chain, Transport } from "viem";
import { SignerWallet } from "../../../types/shared/evm";
import { PaymentPayload, PaymentRequirements, UnsignedPaymentPayload } from "../../../types/verify";
import { createNonce, signAuthorization } from "./sign";
import { encodePayment } from "./utils/paymentUtils";

export function preparePaymentHeader(from: Address, paymentRequirements: PaymentRequirements): UnsignedPaymentPayload {
  const nonce = createNonce();

  const validAfter = BigInt(
    Math.floor(Date.now() / 1000) - 5, // 1 block (2s) before to account for block timestamping
  ).toString();
  const validBefore = BigInt(
    Math.floor(Date.now() / 1000 + paymentRequirements.maxTimeoutSeconds),
  ).toString();

  return {
    x402Version: 1,
    scheme: paymentRequirements.scheme,
    network: paymentRequirements.network,
    payload: {
      signature: undefined,
      authorization: {
        from,
        to: paymentRequirements.payTo as Address,
        value: paymentRequirements.maxAmountRequired,
        validAfter: validAfter.toString(),
        validBefore: validBefore.toString(),
        nonce,
      },
    },
  };
}

export async function signPaymentHeader<transport extends Transport, chain extends Chain>(client: SignerWallet<chain, transport>, paymentRequirements: PaymentRequirements, unsignedPaymentHeader: UnsignedPaymentPayload): Promise<PaymentPayload> {
  const { signature } = await signAuthorization(
    client,
    unsignedPaymentHeader.payload.authorization,
    paymentRequirements,
  );

  return {
    ...unsignedPaymentHeader,
    payload: {
      ...unsignedPaymentHeader.payload,
      signature
    }
  }
}

export async function createPayment<transport extends Transport, chain extends Chain>(
  client: SignerWallet<chain, transport>,
  paymentRequirements: PaymentRequirements,
): Promise<PaymentPayload> {
  const from = client!.account!.address;
  const unsignedPaymentHeader = preparePaymentHeader(from, paymentRequirements);
  return signPaymentHeader(client, paymentRequirements, unsignedPaymentHeader);
}

export async function createPaymentHeader(
  client: SignerWallet,
  paymentRequirements: PaymentRequirements,
): Promise<string> {
  const payment = await createPayment(client, paymentRequirements);
  return encodePayment(payment);
}
