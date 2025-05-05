import { AxiosInstance } from "axios";
import {
  BASE_USDC_ASSET_ID,
  NEAR_USDC_ASSET_ID,
  NEAR_INTENTS_REFERRAL,
  NEAR_INTENTS_CONTRACT,
} from "./constants";
import { randomNonce, transformERC191Signature } from "./utils";
import { evm } from "x402/shared";

// The swap function now supports swap Base USDC to NEAR USDC.
// TODO: The current version assumes the receiver has registered native USDC with sufficient
// storage balance, which needs to be improved in the next version.
export async function publishSwapIntent({
  axiosInstance,
  url,
  signer,
  amount,
  receiverId,
  tokenIn = BASE_USDC_ASSET_ID,
  tokenOut = NEAR_USDC_ASSET_ID,
}: {
  axiosInstance: AxiosInstance,
  url: string,
  signer: evm.wallet.SignerWallet,
  amount: bigint,
  receiverId: string,
  tokenIn?: string,
  tokenOut?: string,
}) {
  const amountIn = amount.toString();

  console.log("Getting quote...");

  const quote = await axiosInstance.post(url, {
    jsonrpc: "2.0",
    id: crypto.randomUUID(),
    method: "quote",
    params: [
      {
        defuse_asset_identifier_in: tokenIn,
        defuse_asset_identifier_out: tokenOut,
        exact_amount_in: amountIn,
        min_deadline_ms: 60000, // 1 minute
        wait_ms: 2000 // 2 seconds
      }
    ]
  });

  const result = quote.data.result[0];
  if (!result) {
    throw new Error("No quote found");
  }

  const { amount_out: amountOut, quote_hash: quoteHash } = result;

  console.log("Publishing intent...");

  const payload = {
    signer_id: signer.account.address.toLowerCase(),
    verifying_contract: NEAR_INTENTS_CONTRACT,
    deadline: new Date(Date.now() + 1000 * 60).toISOString(), // 1 minute from now
    nonce: randomNonce(),
    intents: [
      {
        intent: "token_diff",
        diff: {
          [tokenIn]: "-" + amountIn, // Base USDC
          [tokenOut]: amountOut, // NEAR USDC
        },
        referral: NEAR_INTENTS_REFERRAL
      },
      {
        intent: "ft_withdraw",
        token: tokenOut.split(":")[1], // NEAR USDC
        receiver_id: receiverId,
        amount: amountOut,
      }
    ]
  };

  const signature = await signer.signMessage({
    message: JSON.stringify(payload),
  });

  const res = await axiosInstance.post(url, {
    jsonrpc: "2.0",
    id: "dontcare",
    method: "publish_intent",
    params: [
      {
        signed_data: {
          standard: "erc191",
          payload: JSON.stringify(payload),
          signature: transformERC191Signature(signature)
        },
        quote_hashes: [quoteHash]
      }
    ],
  });

  console.log(res.data.result);
  if (res.data.result.status === "OK") {
    console.log("The intent has been published");
  } else {
    console.error("The intent has failed to publish");
  }

  return res;
}
