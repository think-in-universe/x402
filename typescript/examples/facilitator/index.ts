import express from 'express';
import { verify, settle } from 'x402/facilitator';
import { PaymentRequirementsSchema, PaymentRequirements, evm } from "x402/types";
import { Hex } from 'viem';

const { createClientSepolia, createSignerSepolia } = evm;

const app = express();
const port = 3000;

// Configure express to parse JSON bodies
app.use(express.json());

type VerifyRequest = {
  payload: string;
  details: PaymentRequirements;
};

type SettleRequest = {
  payload: string;
  details: PaymentRequirements;
};

const client = createClientSepolia();

app.get('/verify', (req, res) => {
  res.json({
    endpoint: "/verify",
    description: "POST to verify x402 payments",
    body: {
      payload: "string",
      details: "PaymentRequirements",
    },
  });
});

app.post('/verify', async (req, res) => {
  try {
    const body: VerifyRequest = req.body;
    const paymentRequirements = PaymentRequirementsSchema.parse(body.details);
    const valid = await verify(client, body.payload, paymentRequirements);
    res.json(valid);
  } catch (error) {
    res.status(400).json({ error: 'Invalid request' });
  }
});

app.get('/settle', (req, res) => {
  res.json({
    endpoint: "/settle",
    description: "POST to settle x402 payments",
    body: {
      payload: "string",
      details: "PaymentRequirements",
    },
  });
});

app.post('/settle', async (req, res) => {
  try {
    const signer = createSignerSepolia(process.env.PRIVATE_KEY as Hex);
    const body: SettleRequest = req.body;
    const paymentRequirements = PaymentRequirementsSchema.parse(body.details);
    const response = await settle(signer, body.payload, paymentRequirements);
    res.json(response);
  } catch (error) {
    res.status(400).json({ error: 'Invalid request' });
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});