import { Account, Address, Chain, Transport, verifyTypedData } from "viem";
import { SettleResponse, PaymentDetails, VerifyResponse } from "../../../types/index.js";
import { PaymentPayload } from "../../exact/evm/types.js";
import { getUsdcAddressForChain, getUSDCBalance } from "../../../shared/evm/usdc.js";
import { usdcABI as abi } from "../../../shared/evm/erc20PermitABI.js";
import { ConnectedClient, SignerWallet } from "../../../shared/evm/wallet.js";
import { authorizationTypes } from "../../../shared/evm/eip3009.js";
import { config } from "../../../shared/evm/config.js";
import { SCHEME } from "../../exact/index.js";

/**
 * Verifies a payment payload against the required payment details
 * @param client - The public client used for blockchain interactions
 * @param payload - The signed payment payload containing transfer parameters and signature
 * @param paymentRequirements - The payment requirements that the payload must satisfy
 * @returns A ValidPaymentRequest indicating if the payment is valid and any invalidation reason
 * @remarks This function performs several verification steps:
 * - Verifies protocol version compatibility
 * - Validates the permit signature
 * - Confirms USDC contract address is correct for the chain
 * - Checks permit deadline is sufficiently in the future
 * - Verifies client has sufficient USDC balance
 * - Ensures payment amount meets required minimum
 */
export async function verify<
  transport extends Transport,
  chain extends Chain,
  account extends Account | undefined,
>(
  client: ConnectedClient<transport, chain, account>,
  payload: PaymentPayload,
  paymentRequirements: PaymentRequirements,
): Promise<VerifyResponse> {
  /* TODO: work with security team on brainstorming more verification steps
  verification steps:
    - ✅ verify payload version
    - ✅ verify usdc address is correct for the chain
    - ✅ verify permit signature
    - ✅ verify deadline
    - verify nonce is current
    - ✅ verify client has enough funds to cover paymentRequirements.maxAmountRequired
    - ✅ verify value in payload is enough to cover paymentRequirements.maxAmountRequired
    - check min amount is above some threshold we think is reasonable for covering gas
    - verify resource is not already paid for (next version)
    */

  // Verify payload version
  if (payload.scheme !== SCHEME || paymentRequirements.scheme !== SCHEME) {
    return {
      isValid: false,
      invalidReason: `Incompatible payload scheme. payload: ${payload.scheme}, paymentRequirements: ${paymentRequirements.scheme}, supported: ${SCHEME}`,
    };
  }
  let usdcName: string;
  let chainId: number;
  let usdcAddress: Address;
  let version: string;
  try {
    chainId = getNetworkId(payload.network);
    usdcName = config[chainId.toString()].usdcName;
    usdcAddress = getUsdcAddressForChain(chainId);
    version = await getVersion(client)
  } catch (e) {
    return {
      isValid: false,
      invalidReason: `invalid_network`,
    };
  }
  // Verify permit signature is recoverable for the owner address
  const permitTypedData = {
    types: authorizationTypes,
    primaryType: "TransferWithAuthorization" as const,
    domain: {
      name: usdcName,
      version,
      chainId,
      verifyingContract: paymentRequirements.asset as Address,
    },
    message: {
      from: payload.payload.authorization.from,
      to: payload.payload.authorization.to,
      value: payload.payload.authorization.value,
      validAfter: payload.payload.authorization.validAfter,
      validBefore: payload.payload.authorization.validBefore,
      nonce: payload.payload.authorization.nonce,
    },
  };
  const recoveredAddress = await verifyTypedData({
    address: payload.payload.authorization.from as Address,
    ...permitTypedData,
    signature: payload.payload.signature as Hex,
  });
  if (!recoveredAddress) {
    return {
      isValid: false,
      invalidReason: "invalid_scheme" //"Invalid permit signature",
    };
  }
  // Verify usdc address is correct for the chain
  if (paymentRequirements.asset !== usdcAddress) {
    return {
      isValid: false,
      invalidReason: "invalid_scheme" //"Invalid usdc address",
    };
  }
  // Verify deadline is not yet expired
  // Pad 3 block to account for round tripping
  if (BigInt(payload.payload.authorization.validBefore) < BigInt(Math.floor(Date.now() / 1000) + 6)) {
    return {
      isValid: false,
      invalidReason: "invalid_scheme" //"Deadline on permit isn't far enough in the future",
    };
  }
  // Verify deadline is not yet valid
  if (BigInt(payload.payload.authorization.validAfter) > BigInt(Math.floor(Date.now() / 1000))) {
    return {
      isValid: false,
      invalidReason: "invalid_scheme" //"Deadline on permit is in the future",
    };
  }
  // Verify client has enough funds to cover paymentRequirements.maxAmountRequired
  const balance = await getUSDCBalance(client, payload.payload.authorization.from as Address);
  if (balance < BigInt(paymentRequirements.maxAmountRequired)) {
    return {
      isValid: false,
      invalidReason: "insufficient_funds" //"Client does not have enough funds",
    };
  }
  // Verify value in payload is enough to cover paymentRequirements.maxAmountRequired
  if (BigInt(payload.payload.authorization.value) < BigInt(paymentRequirements.maxAmountRequired)) {
    return {
      isValid: false,
      invalidReason: "invalid_scheme" //"Value in payload is not enough to cover paymentRequirements.maxAmountRequired",
    };
  }
  return {
    isValid: true,
    invalidReason: undefined,
  };
}

/**
 * Settles a payment by executing a USDC transferWithAuthorization transaction
 * @param wallet - The facilitator wallet that will submit the transaction
 * @param payload - The signed payment payload containing the transfer parameters and signature
 * @param paymentRequirements - The original payment details that were used to create the payload
 * @returns A PaymentExecutionResponse containing the transaction status and hash
 * @remarks This function executes the actual USDC transfer using the signed authorization from the user.
 * The facilitator wallet submits the transaction but does not need to hold or transfer any tokens itself.
 */
export async function settle<transport extends Transport, chain extends Chain>(
  wallet: SignerWallet<chain, transport>,
  payload: PaymentPayload,
  paymentRequirements: PaymentRequirements,
): Promise<SettleResponse> {
  // re-verify to ensure the payment is still valid
  const valid = await verify(wallet, payload, paymentRequirements);

  if (!valid.isValid) {
    return {
      success: false,
      network: payload.network,
      transaction: "",
      errorReason: "invalid_scheme" //`Payment is no longer valid: ${valid.invalidReason}`,
    };
  }

  const tx = await wallet.writeContract({
    address: paymentRequirements.asset as Address,
    abi,
    functionName: "transferWithAuthorization" as const,
    args: [
      payload.payload.authorization.from as Address,
      payload.payload.authorization.to as Address,
      BigInt(payload.payload.authorization.value),
      BigInt(payload.payload.authorization.validAfter),
      BigInt(payload.payload.authorization.validBefore),
      payload.payload.authorization.nonce as Hex,
      payload.payload.signature as Hex,
    ],
    chain: wallet.chain as any,
  });

  const receipt = await wallet.waitForTransactionReceipt({ hash: tx });

  if (receipt.status !== "success") {
    return {
      success: false,
      errorReason: 'invalid_scheme', //`Transaction failed`,
      transaction: tx,
      network: payload.network,
    };
  }

  return {
    success: true,
    transaction: tx,
    network: payload.network,
  };
}
