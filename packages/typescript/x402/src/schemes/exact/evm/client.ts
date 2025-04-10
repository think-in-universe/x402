import { PaymentRequirements, PaymentPayload } from "../../../types";
import { getVersion } from "../../../shared/evm/usdc";
import { createNonce, signAuthorization } from "./sign";
import { encodePayment } from "./utils/paymentUtils";
import { SignerWallet } from "../../../shared/evm/wallet";
import { Address, Chain, Transport } from "viem";

export async function createPayment<transport extends Transport, chain extends Chain>(
  client: SignerWallet<chain, transport>,
  paymentRequirements: PaymentRequirements,
): Promise<PaymentPayload> {
  const nonce = createNonce();
  const from = client!.account!.address;

  const validAfter = BigInt(
    Math.floor(Date.now() / 1000) - 5, // 1 block (2s) before to account for block timestamping
  ).toString();
  const validBefore = BigInt(
    Math.floor(Date.now() / 1000 + paymentRequirements.maxTimeoutSeconds),
  ).toString();

  const { signature } = await signAuthorization(
    client,
    {
      from,
      to: paymentRequirements.payTo as Address,
      value: paymentRequirements.maxAmountRequired,
      validAfter,
      validBefore,
      nonce,
    },
    paymentRequirements,
  );

  return {
    x402Version: 1,
    scheme: paymentRequirements.scheme,
    network: paymentRequirements.network,
    payload: {
      signature,
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

export async function createPaymentHeader(
  client: SignerWallet,
  paymentRequirements: PaymentRequirements,
): Promise<string> {
  const payment = await createPayment(client, paymentRequirements);
  return encodePayment(payment);
}
