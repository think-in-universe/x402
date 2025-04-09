import { PaymentRequirements, SettleResponse, VerifyResponse } from "../types/verify";
import axios from "axios";
import { toJsonSafe } from "../shared";

export function useFacilitator(url: string = "https://x402.org/facilitator") {
  async function verify(payload: string, paymentRequirements: PaymentRequirements): Promise<VerifyResponse> {
    const res = await axios.post(`${url}/verify`, {
      payload: payload,
      details: toJsonSafe(paymentRequirements),
    });

    if (res.status !== 200) {
      throw new Error(`Failed to verify payment: ${res.statusText}`);
    }

    return res.data as VerifyResponse;
  }

  async function settle(payload: string, paymentRequirements: PaymentRequirements): Promise<SettleResponse> {
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