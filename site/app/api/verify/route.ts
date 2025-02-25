import { paymentDetailsSchema, PaymentDetails, SignerWallet } from "x402/types";
import {
  createWalletClient,
  Hex,
  http,
  publicActions,
  createClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { verify } from "x402/server";

type VerifyRequest = {
  payload: string;
  details: PaymentDetails;
};

const wallet: SignerWallet = createWalletClient({
  chain: baseSepolia,
  transport: http(),
  account: privateKeyToAccount(
    process.env.FACILITATOR_WALLET_PRIVATE_KEY as Hex
  ),
}).extend(publicActions);

const client = createClient({
  chain: baseSepolia,
  transport: http(),
});

export async function POST(req: Request) {
  const body: VerifyRequest = await req.json();

  const paymentDetails = paymentDetailsSchema.parse(body.details);

  const valid = await verify(client, body.payload, paymentDetails);

  return Response.json({ valid });
}

export async function GET(req: Request) {
  return Response.json({
    endpoint: "/verify",
    description: "POST to verify x402 payments",
    body: {
      payload: "string",
      details: "PaymentDetails",
    },
  });
}
