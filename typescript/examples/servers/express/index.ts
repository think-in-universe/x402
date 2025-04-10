import { config } from 'dotenv';
import express from 'express';
import { configurePaymentMiddleware } from 'x402-express';
import { Network, Resource } from 'x402/types';

config();

const {
  FACILITATOR_URL,
  ADDRESS,
  NETWORK,
} = process.env;

if (!FACILITATOR_URL || !ADDRESS || !NETWORK) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const app = express();
const port = 3000;

const paymentMiddleware = configurePaymentMiddleware({
  facilitatorUrl: FACILITATOR_URL as Resource,
  address: ADDRESS as `0x${string}`,
  network: NETWORK as Network,
})

app.get('/weather', paymentMiddleware("$0.001"), (req, res) => {
  res.send(`Sunny with a chance of rain`);
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});