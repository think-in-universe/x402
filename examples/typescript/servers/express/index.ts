import { config } from "dotenv";
import express from "express";
import { paymentMiddleware, Resource } from "x402-express";
config();

const { FACILITATOR_URL, ADDRESS, PORT } = process.env;

if (!FACILITATOR_URL || !ADDRESS || !PORT) {
  console.error("Missing required environment variables");
  process.exit(1);
}

const app = express();
const port = parseInt(PORT);

app.use(paymentMiddleware({
  facilitator: {
    url: FACILITATOR_URL as Resource,
  },
  payToAddress: ADDRESS as `0x${string}`,
  routes: {
    "GET /weather": {
      // USDC amount in dollars
      price: "$0.001",
      network: "base"
    },
    "/premium/*": {
      // Define atomic amounts in any EIP-3009 token
      price: {
        amount: "100000",
        asset: {
          address: "0xabc",
          decimals: 18,
          eip712: {
            name: "WETH",
            version: "1",
          },
        },
      },
      network: "base"
    }
  },
}));

app.get("/weather", (req, res) => {
  res.send({
    report: {
      weather: "sunny",
      temperature: 70,
    },
  });
});

app.get("/premium/content", (req, res) => {
  res.send({
    content: "This is premium content",
  });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
