import express from 'express';
import { configurePaymentMiddleware } from 'x402-express';
import { Network, Resource } from 'x402/types';

const app = express();
const port = 3000;

const paymentMiddleware = configurePaymentMiddleware({
  facilitatorUrl: process.env.FACILITATOR_URL as Resource,
  address: process.env.ADDRESS as `0x${string}`,
  network: process.env.NETWORK as Network,
})

app.get('/weather', paymentMiddleware("$0.001"), (req, res) => {
  res.send(`Sunny with a chance of rain`);
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});