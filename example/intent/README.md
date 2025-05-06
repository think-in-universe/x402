# x402 Payment Proxy Demo with NEAR Intents

This example demonstrates how to implement a payment proxy using x402's middleware system, showcased through a NEAR Intents integration for swapping Base USDC to NEAR USDC. The demo illustrates how to handle deposit into NEAR Intents per request using x402.

## Setup and Configuration

### 1. Install Dependencies
First, we need to build and install all necessary packages:

```bash
# Navigate to the root directory and install root dependencies
cd ../.. && npm install

# Build the x402 package which contains core functionality
cd packages/typescript/x402 && npm run build

# Install the example's dependencies
cd ../../../example/intent && npm install
```

### 2. Configure Environment
Set up your Base address private key and other configuration:

```bash
cp .env.example .env
```

Then edit `.env` to include:
- Your Base address private key (required for signing payment message)

## Running the Example

### 1. Start the Facilitator Server
The facilitator handles payment verification and settlement:

```bash
npm run facilitator
```

### 2. Start the Resource Server
The resource server acts as the x402 proxy endpoint for NEAR Intents RPC:

```bash
npm run resource
```

### 3. Run the Client Demo
Execute the USDC swap example:

```bash
npm run client
```

Important prerequisites:
- Must have USDC in your Base mainnet address
- Recommended minimum: 0.01 USDC for testing
- Ensure your Base address has enough ETH for gas
