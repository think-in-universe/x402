import axios from "axios";
import { withPaymentInterceptor } from "x402-axios";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { http, publicActions, createWalletClient } from "viem";
import { Hex } from "viem";
import { publishSwapIntent } from "./intents";
import { BASE_USDC_ASSET_ID, NEAR_USDC_ASSET_ID } from "./constants";

const wallet = createWalletClient({
  chain: base,
  transport: http(),
  account: privateKeyToAccount(process.env.PRIVATE_KEY as Hex),
}).extend(publicActions);

const resourceUrl = "http://localhost:4021/rpc";

const axiosInstance = withPaymentInterceptor(axios.create({}), wallet);

// Publish an intent that swaps 0.01 Base USDC to NEAR USDC
await publishSwapIntent({
  axiosInstance,
  url: resourceUrl,
  signer: wallet,
  receiverId: "robertyan.near",
  amount: 10000n,  // 0.01 USDC
  tokenIn: BASE_USDC_ASSET_ID,
  tokenOut: NEAR_USDC_ASSET_ID,
});
