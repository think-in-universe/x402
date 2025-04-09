import { z } from "zod";
import { safeBase64Decode, safeBase64Encode } from "../../shared";
import { PaymentRequirementsSchema, SettleResponse } from "../verify";

export const facilitatorRequestSchema = z.object({
  paymentHeader: z.string(),
  paymentRequirements: PaymentRequirementsSchema,
});

export type FacilitatorRequest = z.infer<typeof facilitatorRequestSchema>;

export function settleResponseHeader(response: SettleResponse): string {
  return safeBase64Encode(JSON.stringify(response));
}

export function settleResponseFromHeader(header: string): SettleResponse {
  const decoded = safeBase64Decode(header);
  return JSON.parse(decoded) as SettleResponse;
}