import { config } from "dotenv";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { paymentMiddleware, Network, Resource } from "x402-hono";

config();

const { FACILITATOR_URL, ADDRESS, NETWORK, PORT } = process.env;

if (!FACILITATOR_URL || !ADDRESS || !NETWORK || !PORT) {
  console.error("Missing required environment variables");
  process.exit(1);
}

const app = new Hono();
const port = parseInt(PORT);

app.use(paymentMiddleware({
  facilitator: {
    url: FACILITATOR_URL as Resource,
  },
  payToAddress: ADDRESS as `0x${string}`,
  routes: {
    "/weather": {
      price: "$0.001",
      network: NETWORK as Network,
    },
  },
}));

app.get(
  "/weather",
  c => {
    return c.json({
      report: {
        weather: "sunny",
        temperature: 70,
      },
    });
  },
);

serve({
  fetch: app.fetch,
  port,
});
