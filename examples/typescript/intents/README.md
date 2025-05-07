# NEAR Intents x402 Payment Demo 

By merging x402’s frictionless payments with [NEAR Intents](https://near.org/intents), we allow users to confidently buy anything through their AI agent, while agent developers collect revenue through cross-chain settlements that make blockchain complexity invisible.

This example demonstrates how to implement a payment proxy server using x402's middleware system, which handles deposit into NEAR Intents per intent using x402. The client demo illustrates how to swap Base USDC into NEAR USDC with x402 and NEAR Intents.


## Setup and Configuration

### 1. Install Dependencies
First, we need to build and install all necessary packages:

```bash
# Navigate to the root directory and install root dependencies
cd ../../.. && pnpm install

# Build the x402 package which contains core functionality
cd typescript && pnpm run build

# Install the example's dependencies
cd ../examples/typescript && pnpm install && cd intents
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
npm run server
```

### 3. Run the Client Demo
Execute demo that swaps $0.01 Base USDC to NEAR USDC:

```bash
npm run client
```

Important prerequisites:
- Must have USDC in your Base mainnet address
- Recommended minimum: 0.01 USDC for testing
- Ensure your Base address has enough ETH for gas
