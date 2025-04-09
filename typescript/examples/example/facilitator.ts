import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { createWalletClient, Hex, http, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

import { verify, settle } from "x402/facilitator";
import { PaymentRequirementsSchema, PaymentRequirements } from "x402/types";

const port = 4020;

type VerifyRequest = {
  payload: string;
  details: PaymentRequirements;
};

type SettleRequest = {
  payload: string;
  details: PaymentRequirements;
};

const wallet = createWalletClient({
  chain: baseSepolia,
  transport: http(),
  account: privateKeyToAccount(process.env.FACILITATOR_WALLET_PRIVATE_KEY as Hex),
}).extend(publicActions);

const app = new Hono();
app.use("*", logger());

app.post("/verify", async c => {
  // TODO: add zod validation
  const req: VerifyRequest = await c.req.json();

  console.log("verifying request", {
    payload: req.payload,
    details: req.details,
  });

  const paymentRequirements = PaymentRequirementsSchema.parse(req.details);

  const valid = await verify(wallet, req.payload, paymentRequirements);

  console.log("verification result", valid);
  return c.json(valid);
});

app.post("/settle", async c => {
  const req: SettleRequest = await c.req.json();

  const paymentRequirements = PaymentRequirementsSchema.parse(req.details);

  console.log("settling request", {
    payload: req.payload,
    details: paymentRequirements,
  });

  const res = await settle(wallet, req.payload, paymentRequirements);

  console.log("settlement result", res);
  return c.json(res);
});

console.log(`Facilitator running on port ${port}`);

serve({
  port: port,
  fetch: app.fetch,
});
