import { PaymentRequirementsSchema, PaymentRequirements } from "../../../../typescript/packages/x402/src/types/verify";
import { verify } from "../../../../typescript/packages/x402/src/facilitator";
import { createClientSepolia } from "../../../../typescript/packages/x402/src/types/shared/evm/wallet";

type VerifyRequest = {
  payload: string;
  details: PaymentRequirements;
};

const client = createClientSepolia();

export async function POST(req: Request) {
  const body: VerifyRequest = await req.json();

  const paymentRequirements = PaymentRequirementsSchema.parse(body.details);

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
