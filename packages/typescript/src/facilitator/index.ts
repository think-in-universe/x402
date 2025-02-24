import { Hono } from "hono";
import { logger } from "hono/logger";

import { SignerWallet } from "@/shared/evm/wallet";
import { PaymentDetails, paymentDetailsSchema } from "@/shared/types";
import { settle, verify } from "@/facilitator/exact/evm";
import { decodePayment } from "../client/exact/evm/sign";

type VerifyRequest = {
  payload: string;
  details: PaymentDetails;
};

type SettleRequest = {
  payload: string;
  details: PaymentDetails;
};

export function makeServer(wallet: SignerWallet): Hono {
  const app = new Hono();
  app.use("*", logger());

  app.post("/verify", async (c) => {
    // TODO: add zod validation
    const req: VerifyRequest = await c.req.json();

    const paymentDetails = paymentDetailsSchema.parse(req.details);
    const payload = decodePayment(req.payload);

    const valid = await verify(wallet, payload, paymentDetails);
    return c.json(valid);
  });

  app.post("/settle", async (c) => {
    const req: SettleRequest = await c.req.json();

    const paymentDetails = paymentDetailsSchema.parse(req.details);
    const payload = decodePayment(req.payload);

    const res = await settle(wallet, payload, paymentDetails);

    console.log("Payment processed", res);
    return c.json(res);
  });

  return app;
}
