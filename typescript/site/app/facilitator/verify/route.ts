import { PaymentRequirementsSchema, PaymentRequirements } from "x402/types";
import { verify } from "x402/facilitator";
import { evm } from "x402/shared";

type VerifyRequest = {
  payload: string;
  details: PaymentRequirements;
};

const client = evm.wallet.createClientSepolia();

export async function POST(req: Request) {
  const body: VerifyRequest = await req.json();

  const paymentRequirements = PaymentRequirementsSchema.parse(body.details);

  // @ts-expect-error infinite instantiation
  const valid = await verify(client, body.payload, paymentRequirements);

  return Response.json(valid);
}

export async function GET() {
  return Response.json({
    endpoint: "/verify",
    description: "POST to verify x402 payments",
    body: {
      payload: "string",
      details: "PaymentRequirements",
    },
  });
}
