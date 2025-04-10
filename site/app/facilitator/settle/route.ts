import { PaymentRequirementsSchema, PaymentRequirements } from "../../../../typescript/packages/x402/src/types/verify";
import { settle } from "../../../../typescript/packages/x402/src/facilitator";
import { createSignerSepolia } from "../../../../typescript/packages/x402/src/types/shared/evm/wallet";
import { Hex } from "viem";

type SettleRequest = {
  payload: string;
  details: PaymentRequirements;
};


export async function POST(req: Request) {
  const wallet = createSignerSepolia(process.env.PRIVATE_KEY as Hex);

  const body: SettleRequest = await req.json();

  const paymentRequirements = PaymentRequirementsSchema.parse(body.details);

  const response = await settle(wallet, body.payload, paymentRequirements);

  return Response.json(response);
}

export async function GET() {
  return Response.json({
    endpoint: "/settle",
    description: "POST to settle x402 payments",
    body: {
      payload: "string",
      details: "PaymentRequirements",
    },
  });
}
