import {
  PaymentPayload,
  PaymentRequirements,
  SettleResponse,
  VerifyResponse,
} from "../types/verify";
import axios from "axios";
import { createAuthHeader, toJsonSafe } from "../shared";
import { Resource } from "../types";

/**
 * AuthOptions is an optional object that can be used to authenticate requests to the facilitator service
 *
 * @param cdpApiKeyId - The CDP API key ID
 * @param cdpApiKeySecret - The CDP API key secret
 */
export interface AuthOptions {
  cdpApiKeyId: string;
  cdpApiKeySecret: string;
}

/**
 * Creates a facilitator client for interacting with the X402 payment facilitator service
 *
 * @param url - The base URL of the facilitator service (defaults to "https://x402.org/facilitator")
 * @param authOptions - Optional authentication options for the facilitator service
 * @returns An object containing verify and settle functions for interacting with the facilitator
 */
export function useFacilitator(
  url: Resource = "https://x402.org/facilitator",
  authOptions?: AuthOptions,
) {
  /**
   * Verifies a payment payload with the facilitator service
   *
   * @param payload - The payment payload to verify
   * @param paymentRequirements - The payment requirements to verify against
   * @returns A promise that resolves to the verification response
   */
  async function verify(
    payload: PaymentPayload,
    paymentRequirements: PaymentRequirements,
  ): Promise<VerifyResponse> {
    const res = await axios.post(
      `${url}/v2/x402/verify`,
      {
        payload: toJsonSafe(payload),
        details: toJsonSafe(paymentRequirements),
      },
      {
        headers: authOptions
          ? {
            Authorization: await createAuthHeader(
              authOptions.cdpApiKeyId,
              authOptions.cdpApiKeySecret,
              url,
              "/v2/x402/verify",
            ),
          }
          : undefined,
      },
    );

    if (res.status !== 200) {
      throw new Error(`Failed to verify payment: ${res.statusText}`);
    }

    return res.data as VerifyResponse;
  }

  /**
   * Settles a payment with the facilitator service
   *
   * @param payload - The payment payload to settle
   * @param paymentRequirements - The payment requirements for the settlement
   * @returns A promise that resolves to the settlement response
   */
  async function settle(
    payload: PaymentPayload,
    paymentRequirements: PaymentRequirements,
  ): Promise<SettleResponse> {
    const res = await axios.post(
      `${url}/v2/x402/settle`,
      {
        payload: toJsonSafe(payload),
        details: toJsonSafe(paymentRequirements),
      },
      {
        headers: authOptions
          ? {
            Authorization: await createAuthHeader(
              authOptions.cdpApiKeyId,
              authOptions.cdpApiKeySecret,
              url,
              "/v2/x402/settle",
            ),
          }
          : undefined,
      },
    );

    if (res.status !== 200) {
      throw new Error(`Failed to settle payment: ${res.statusText}`);
    }

    return res.data as SettleResponse;
  }

  return { verify, settle };
}

export const { verify, settle } = useFacilitator();
