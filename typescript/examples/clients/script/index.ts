import { config } from 'dotenv';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { withPaymentInterceptor } from "x402-axios"
import axios from "axios"

config();

const {
  RESOURCE_SERVER_URL,
  PRIVATE_KEY,
  ENDPOINT_PATH,
} = process.env;

if (
  !RESOURCE_SERVER_URL ||
  !PRIVATE_KEY ||
  !ENDPOINT_PATH
) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
const client = createWalletClient({
  account,
  transport: http(),
});

const api = axios.create({
  baseURL: `${RESOURCE_SERVER_URL}`
})

withPaymentInterceptor(api, client)

api.get(`${ENDPOINT_PATH}`).then(res => {
  console.log(res.data)
}).catch(err => {
  console.log(err.response.data)
})
