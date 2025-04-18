# x402-fetch Example Client

This is an example client that demonstrates how to use the `x402-fetch` package to make HTTP requests to endpoints protected by the x402 payment protocol.

## Prerequisites

- Node.js (v18 or higher)
- A running x402 facilitator (you can use the example facilitator at `examples/facilitator`)
- A running x402 server (you can use the example express server at `examples/servers/express`)
- A valid Ethereum private key for making payments

## Setup

1. First, start the facilitator:
```bash
cd examples/facilitator
pnpm install
pnpm dev
```

2. First, start the example express server:
```bash
cd examples/servers/express
pnpm install
pnpm dev
```
The server will run on http://localhost:3001

3. Create a `.env` file in the client's directory with the following variables:
```env
RESOURCE_SERVER_URL=http://localhost:3001
PRIVATE_KEY=0xYourPrivateKey
ENDPOINT_PATH=/weather
```

4. In a new terminal, install and run the example client:
```bash
cd examples/clients/fetch
pnpm install
pnpm dev
```

## How It Works

The example demonstrates how to:
1. Create a wallet client using viem
2. Wrap the native fetch function with x402 payment handling
3. Make a request to a paid endpoint
4. Handle the response or any errors

## Example Code

```typescript
import { config } from "dotenv";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { wrapFetchWithPayment } from "x402-fetch";
import { baseSepolia } from "viem/chains";

config();

const { RESOURCE_SERVER_URL, PRIVATE_KEY, ENDPOINT_PATH } = process.env;

// Create wallet client
const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
const client = createWalletClient({
  account,
  transport: http(),
  chain: baseSepolia,
});

// Wrap fetch with payment handling
const fetchWithPay = wrapFetchWithPayment(fetch, client);

// Make request to paid endpoint
fetchWithPay(`${RESOURCE_SERVER_URL}${ENDPOINT_PATH}`, {
  method: "GET",
})
  .then(async response => {
    const body = await response.json();
    console.log(body);
  })
  .catch(error => {
    console.error(error.response?.data?.error);
  });
```

## Response Handling

### Payment Required (402)
When a payment is required, the wrapped fetch function will:
1. Receive the 402 response
2. Parse the payment requirements
3. Create and sign a payment header
4. Automatically retry the request with the payment header

### Successful Response
After payment is processed, you'll receive the actual response from the endpoint:
```json
{
  "report": {
    "weather": "sunny",
    "temperature": 70
  }
}
```

## Error Handling

The example includes basic error handling for:
- Missing environment variables
- Payment failures
- Network errors
- Invalid responses

## Extending the Example

To use this pattern in your own application:

1. Install the required dependencies:
```bash
npm install x402-fetch viem
```

2. Set up your environment variables
3. Create a wallet client
4. Wrap your fetch function
5. Make requests to paid endpoints

## Security Notes

- Never commit your private key to version control
- Use environment variables for sensitive information
- Consider using a more secure key management solution in production
