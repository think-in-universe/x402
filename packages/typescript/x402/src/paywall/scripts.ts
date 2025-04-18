import {
  createWalletClient,
  createPublicClient,
  http,
  custom,
  publicActions,
  Transport,
} from "viem";
import { createConfig, connect, disconnect, getAccount, switchChain } from "@wagmi/core";
import { injected } from "@wagmi/connectors";
import { base, baseSepolia } from "viem/chains";

import { SignerWallet, ConnectedClient } from "../shared/evm/wallet.js";
import { createPaymentHeader } from "../schemes/exact/evm/client.js";
import { createPayment } from "../schemes/exact/evm/client.js";
import { createNonce, signAuthorization } from "../schemes/exact/evm/sign.js";
import { encodePayment } from "../schemes/exact/evm/utils/paymentUtils.js";
import { getUSDCBalance, getVersion } from "../shared/evm/usdc.js";
import { PaymentDetails } from "../types/index.js";

declare global {
  interface Window {
    x402: {
      amount?: number;
      testnet?: boolean;
      paymentDetails: PaymentDetails;
      currentUrl: string;
      config: {
        chainConfig: Record<
          string,
          {
            usdcAddress: string;
            usdcName: string;
          }
        >;
      };
    };
    ethereum?: any;
  }
}

function ensureFunctionsAreAvailable() {
  // This is just to make sure these functions get bundled
  return {
    createPaymentHeader,
    createPayment,
    signAuthorization,
    createNonce,
    getVersion,
    encodePayment,
  };
}

// Function to update UI with payment details
function updatePaymentUI(x402: Window["x402"]) {
  if (!x402) return;

  const amount = x402.amount || 0;
  const paymentDetails = x402.paymentDetails || {};
  const testnet = x402.testnet ?? true;
  const chainName = testnet ? "Base Sepolia" : "Base";

  // Update payment description
  const descriptionEl = document.getElementById("payment-description");
  if (descriptionEl) {
    descriptionEl.textContent = paymentDetails.description
      ? `${paymentDetails.description}. To access this content, please pay $${amount} ${chainName} USDC.`
      : `To access this content, please pay $${amount} ${chainName} USDC.`;
  }

  // Update amount
  const amountEl = document.getElementById("payment-amount");
  if (amountEl) {
    amountEl.textContent = `$${amount} USDC`;
  }

  // Update network
  const networkEl = document.getElementById("payment-network");
  if (networkEl) {
    networkEl.textContent = chainName;
  }
}

async function initializeApp() {
  const x402 = window.x402;

  const wagmiConfig = createConfig({
    chains: [base, baseSepolia],
    connectors: [injected()],
    transports: {
      [base.id]: http(),
      [baseSepolia.id]: http(),
    },
  });

  ensureFunctionsAreAvailable();

  const chain = x402.testnet ? baseSepolia : base;
  let walletClient: SignerWallet;
  const publicClient: ConnectedClient<Transport, typeof chain, undefined> = createPublicClient({
    chain,
    transport: custom(window.ethereum),
  }).extend(publicActions);

  // DOM Elements
  const connectWalletBtn = document.getElementById("connect-wallet");
  const paymentSection = document.getElementById("payment-section");
  const payButton = document.getElementById("pay-button");
  const statusDiv = document.getElementById("status");

  if (!connectWalletBtn || !paymentSection || !payButton || !statusDiv) {
    console.error("Required DOM elements not found");
    return;
  }

  // Connect wallet handler
  connectWalletBtn.addEventListener("click", async () => {
    // If wallet is already connected, disconnect it
    const { isConnected } = getAccount(wagmiConfig);
    if (isConnected) {
      try {
        await disconnect(wagmiConfig);
        connectWalletBtn.textContent = "Connect Wallet";
        paymentSection.classList.add("hidden");
        statusDiv.textContent = "";
        return;
      } catch (error) {
        statusDiv.textContent = "Failed to disconnect wallet";
        return;
      }
    }

    try {
      statusDiv.textContent = "Connecting wallet...";

      const result = await connect(wagmiConfig, {
        connector: injected(),
        chainId: chain.id,
      });

      if (!result.accounts?.[0]) {
        throw new Error("No account selected in your wallet");
      }

      const address = result.accounts[0];
      walletClient = createWalletClient({
        chain,
        transport: custom(window.ethereum),
        account: {
          address: address as `0x${string}`,
          type: "json-rpc",
        },
      }).extend(publicActions) as SignerWallet;

      connectWalletBtn.textContent = `${address.slice(0, 6)}...${address.slice(-4)}`;
      paymentSection.classList.remove("hidden");
      statusDiv.textContent = "Wallet connected! You can now proceed with payment.";
    } catch (error) {
      statusDiv.textContent = error instanceof Error ? error.message : "Failed to connect wallet";
      // Reset UI state
      connectWalletBtn.textContent = "Connect Wallet";
      paymentSection.classList.add("hidden");
    }
  });

  // Payment handler
  payButton.addEventListener("click", async () => {
    const { isConnected, chainId: connectedChainId } = getAccount(wagmiConfig);
    if (!isConnected) {
      throw new Error("No wallet connected");
    }
    if (connectedChainId !== chain.id) {
      try {
        await switchChain(wagmiConfig, { chainId: chain.id });
      } catch (error) {
        statusDiv.textContent =
          error instanceof Error
            ? error.message
            : `Please switch to ${chain.name} network in your wallet`;
        return;
      }
    }

    try {
      statusDiv.textContent = "Checking USDC balance...";
      const balance = await getUSDCBalance(publicClient, walletClient.account.address);
      if (balance === 0n) {
        throw new Error(
          `Your USDC balance is 0. Please make sure you have USDC tokens on ${chain.name}`,
        );
      }
    } catch (error) {
      statusDiv.textContent =
        error instanceof Error ? error.message : "Failed to check USDC balance";
      return;
    }

    statusDiv.textContent = "Creating payment signature...";

    try {
      const paymentHeader = await createPaymentHeader(walletClient, x402.paymentDetails);

      statusDiv.textContent = "Requesting content with payment...";

      const response = await fetch(x402.currentUrl, {
        headers: {
          "X-PAYMENT": paymentHeader,
          "Access-Control-Expose-Headers": "X-PAYMENT-RESPONSE",
        },
      });

      if (response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("text/html")) {
          document.documentElement.innerHTML = await response.text();
        } else {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          window.location.href = url;
        }
      } else {
        throw new Error("Payment failed: " + response.statusText);
      }
    } catch (error) {
      statusDiv.textContent = error instanceof Error ? error.message : "Payment failed";
    }
  });
}

window.addEventListener("load", () => {
  // Update the UI with payment details
  updatePaymentUI(window.x402);

  initializeApp();
});
