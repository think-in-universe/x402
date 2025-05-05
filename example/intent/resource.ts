import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { paymentMiddleware } from "x402/hono";
import axios from "axios";
import { SOLVER_RELAY_BASE_URL } from "./constants";

const app = new Hono();
const port = 4021;

// app.use("/rpc", paymentMiddleware("$0.01", "0x209693Bc6afc0C5328bA36FaF03C514EF312287C", {
//   facilitatorUrl: 'http://localhost:4020'
// }));

app.use("*", logger());

app.post("/rpc", async c => {
  const req = await c.req.json();

  console.log("redirecting request", req);

  const res = await axios.post(`${SOLVER_RELAY_BASE_URL}/rpc`, req);

  return c.json(res.data);
});

console.log(`Resource running on port ${port}`);

serve({
  port: port,
  fetch: app.fetch,
});
