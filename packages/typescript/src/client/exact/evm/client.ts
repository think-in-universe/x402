import { PaymentNeededDetails, PaymentPayloadV1 } from "@/shared/types";
import { getVersion } from "@/shared/evm/usdc";
import { createNonce, encodePayment, signAuthorization } from "./sign";
import { SignerWallet } from "@/shared/evm/wallet";

export async function createPayment(
  client: SignerWallet,
  paymentDetails: PaymentNeededDetails
): Promise<PaymentPayloadV1> {
  const nonce = createNonce();
  const version = await getVersion(client);
  const from = client!.account!.address;

  const validAfter = BigInt(
    Math.floor(Date.now() / 1000) - 5 // 1 block (2s) before to account for block timestamping
  );
  const validBefore = BigInt(
    Math.floor(Date.now() / 1000 + paymentDetails.requiredDeadlineSeconds)
  );

  const { signature } = await signAuthorization(client, {
    from,
    to: paymentDetails.resourceAddress,
    value: paymentDetails.maxAmountRequired,
    validAfter,
    validBefore,
    nonce,
    chainId: client.chain!.id,
    version,
    usdcAddress: paymentDetails.usdcAddress,
  });

  return {
    version: 1,
    payload: {
      signature,
      params: {
        from,
        to: paymentDetails.resourceAddress,
        value: paymentDetails.maxAmountRequired,
        validAfter,
        validBefore,
        nonce,
        chainId: client.chain!.id,
        version,
        usdcAddress: paymentDetails.usdcAddress,
      },
    },
    resource: paymentDetails.resource,
  };
}

export async function createPaymentHeader(
  client: SignerWallet,
  paymentDetails: PaymentNeededDetails
): Promise<string> {
  const payment = await createPayment(client, paymentDetails);
  return encodePayment(payment);
}
