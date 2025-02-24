import axios from "axios";
import { PaymentDetails, SettleResponse, VerifyResponse } from "@/shared/types";
import { toJsonSafe } from "../shared/types/convert";

export function useFacilitator(url: string = "http://localhost:4020") {
  async function verify(
    payload: string,
    paymentDetails: PaymentDetails
  ): Promise<VerifyResponse> {
    const res = await axios.post(`${url}/verify`, {
      payload: payload,
      details: toJsonSafe(paymentDetails),
    });

    if (res.status !== 200) {
      throw new Error(`Failed to verify payment: ${res.statusText}`);
    }

    return res.data as VerifyResponse;
  }

  async function settle(
    payload: string,
    paymentDetails: PaymentDetails
  ): Promise<SettleResponse> {
    const res = await axios.post(`${url}/settle`, {
      payload: payload,
      details: toJsonSafe(paymentDetails),
    });

    if (res.status !== 200) {
      throw new Error(`Failed to settle payment: ${res.statusText}`);
    }

    return res.data as SettleResponse;
  }

  return { verify, settle };
}

export const { verify, settle } = useFacilitator();
