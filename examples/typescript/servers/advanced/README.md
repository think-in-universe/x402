# x402 Advanced Resource Server Example

This is an advanced example of an Express.js server that demonstrates how to implement paywall functionality without using middleware. This approach is useful for more complex scenarios, such as:

- Asynchronous payment settlement
- Custom payment validation logic
- Complex routing requirements
- Integration with existing authentication systems

## Prerequisites

- Node.js (v20 or higher)
- A valid Ethereum address for receiving payments

## Setup

Copy `.env-local` to `.env` and add your Ethereum address:

```bash
cp .env-local .env
```

## Implementation Overview

This advanced implementation provides a structured approach to handling payments with:

1. Helper functions for creating payment requirements and verifying payments
2. Support for both synchronous and asynchronous payment settlement
3. Proper error handling and response formatting
4. Integration with the x402 facilitator service

## Testing the Server

You can test the server using one of the example clients:

### Using the Fetch Client
```bash
cd ../../clients/fetch
# Ensure .env is setup
npm install
npm dev
```

### Using the Axios Client
```bash
cd ../../clients/axios
# Ensure .env is setup
npm install
npm dev
```

## Example Endpoints

The server includes example endpoints that demonstrate different payment scenarios:

### Synchronous Payment
- `/weather` - Requires immediate payment of $0.001 to access
- Returns a simple weather report
- Payment is verified and settled before returning the response

### Asynchronous Payment
- `/async-weather` - Supports delayed payment settlement
- Returns the weather data immediately
- Processes payment asynchronously in the background

## Response Format

### Payment Required (402)
```json
{
  "x402Version": 1,
  "error": "X-PAYMENT header is required",
  "accepts": [
    {
      "scheme": "exact",
      "network": "base-sepolia",
      "maxAmountRequired": "1000",
      "resource": "http://localhost:3001/weather",
      "description": "Access to weather data",
      "mimeType": "",
      "payTo": "0xYourAddress",
      "maxTimeoutSeconds": 60,
      "asset": "0x...",
      "outputSchema": null,
      "extra": {
        "name": "USD Coin",
        "version": "1"
      }
    }
  ]
}
```

### Successful Response
```json
// Body
{
  "report": {
    "weather": "sunny",
    "temperature": 70
  }
}
// Headers
{
  "X-PAYMENT-RESPONSE": "..." // Encoded response object
}
```

## Extending the Example

To add more paid endpoints, you can follow this pattern:

```typescript
app.get("/your-endpoint", async (req, res) => {
  const resource = `${req.protocol}://${req.headers.host}${req.originalUrl}` as Resource;
  const paymentRequirements = createPaymentRequirements(
    "$0.001", // Your price
    "base-sepolia", // Your network
    resource,
    "Description of your resource"
  );

  const isValid = await verifyPayment(req, res, paymentRequirements);
  if (!isValid) return;

  // For synchronous payment
  try {
    const settleResponse = await settle(
      exact.evm.decodePayment(req.header("X-PAYMENT")!),
      paymentRequirements[0]
    );
    const responseHeader = settleResponseHeader(settleResponse);
    res.setHeader("X-PAYMENT-RESPONSE", responseHeader);

    // Return your protected resource
    res.json({
      // Your response data
    });
  } catch (error) {
    res.status(402).json({
      x402Version,
      error,
      accepts: paymentRequirements,
    });
  }
});
```
