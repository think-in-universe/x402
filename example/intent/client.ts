import axios from "axios";
import { withPaymentInterceptor } from "x402/axios";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { http, publicActions, createWalletClient } from "viem";
import { Hex } from "viem";
import { BASE_USDC_ASSET_ID, NEAR_USDC_ASSET_ID, NEAR_INTENTS_REFERRAL } from "./constants";
import { randomNonce, transformERC191Signature } from "./utils";

const wallet = createWalletClient({
  chain: base,
  transport: http(),
  account: privateKeyToAccount(process.env.PRIVATE_KEY as Hex),
}).extend(publicActions);

const resourceUrl = "http://localhost:4021/rpc";

let axiosInstance = axios.create({});
axiosInstance = withPaymentInterceptor(axiosInstance, wallet);

const receiverId = "robertyan.near";
const amountIn = "10000"; // 0.01 USDC

console.log("Getting quote...");

const quote = await axiosInstance.post(resourceUrl, {
  jsonrpc: "2.0",
  id: crypto.randomUUID(),
  method: "quote",
  params: [
    {
      defuse_asset_identifier_in: BASE_USDC_ASSET_ID,
      defuse_asset_identifier_out: NEAR_USDC_ASSET_ID,
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

console.log("Publishing intents");

const payload = {
  signer_id: wallet.account.address.toLowerCase(),
  verifying_contract: "intents.near",
  deadline: new Date(Date.now() + 1000 * 60).toISOString(), // 1 minute from now
  nonce: randomNonce(),
  intents: [
      {
          intent: "token_diff",
          diff: {
              [BASE_USDC_ASSET_ID]: "-" + amountIn, // Base USDC
              [NEAR_USDC_ASSET_ID]: amountOut, // NEAR USDC
          },
          referral: NEAR_INTENTS_REFERRAL
      },
      {
          intent: "ft_withdraw",
          token: NEAR_USDC_ASSET_ID.split(":")[1], // NEAR USDC
          receiver_id: receiverId,
          amount: amountOut,
      }
  ]
};

const signature = await wallet.signMessage({
  message: JSON.stringify(payload),
});

const res = await axiosInstance.post(resourceUrl, {
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

console.log(res.data);
console.log("The intent has been published");
