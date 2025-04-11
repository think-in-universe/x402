import { PaymentRequirements, SettleResponse, VerifyResponse } from "../types/verify";
import axios from "axios";
import { toJsonSafe } from "../shared";

/**
 * Creates a facilitator client for interacting with the X402 payment facilitator service
 *
 * @param url - The base URL of the facilitator service (defaults to "https://x402.org/facilitator")
 * @returns An object containing verify and settle functions for interacting with the facilitator
 */
export function useFacilitator(url: string = "https://x402.org/facilitator") {
  /**
   * Verifies a payment payload with the facilitator service
   *
   * @param payload - The payment payload to verify
   * @param paymentRequirements - The payment requirements to verify against
   * @returns A promise that resolves to the verification response
   */
  async function verify(
    payload: string,
    paymentRequirements: PaymentRequirements,
  ): Promise<VerifyResponse> {
    const res = await axios.post(`${url}/verify`, {
      payload: payload,
      details: toJsonSafe(paymentRequirements),
    });

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
    payload: string,
    paymentRequirements: PaymentRequirements,
  ): Promise<SettleResponse> {
    const res = await axios.post(`${url}/settle`, {
      payload: payload,
      details: toJsonSafe(paymentRequirements),
    });

    if (res.status !== 200) {
      throw new Error(`Failed to settle payment: ${res.statusText}`);
    }

    return res.data as SettleResponse;
  }

  return { verify, settle };
}

export const { verify, settle } = useFacilitator();
