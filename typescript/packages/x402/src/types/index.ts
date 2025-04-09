import { z } from "zod";
import { safeBase64Encode, safeBase64Decode } from "../shared";
import { PaymentRequirementsSchema, SettleResponse } from "./x402Specs";
export * from "./x402Specs";
export * from "./network";

export { SignerWallet } from "../shared/evm/wallet";


// const resourceSchema = z.string().regex(/^[^:]+:\/\/.+$/) as z.ZodType<Resource>;

/** Payment Payload */

// export type PaymentPayload<T> = {
//   // Version of the x402 payment protocol
//   x402Version: number;
//   // Scheme of the payment protocol to use
//   scheme: string;
//   // Network of the blockchain to send payment on
//   networkId: string;
//   // Payload of the payment protocol
//   payload: T;
//   // Resource to pay for
//   resource: Resource;
// };

// export function makePaymentPayloadSchema<T>(payloadSchema: z.ZodSchema<T>) {
//   return z.object({
//     x402Version: z.number(),
//     scheme: z.string(),
//     networkId: z.string(),
//     payload: payloadSchema,
//     resource: resourceSchema,
//   });
// }

/** end Payment Payload */

/** Facilitator Types */

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

/** end Facilitator Types */

/** Utility Types */

export const moneySchema = z
  .union([z.string().transform(x => x.replace(/[^0-9.-]+/g, "")), z.number()])
  .pipe(z.coerce.number().min(0.0001).max(999999999));

export type Money = z.input<typeof moneySchema>;

export type Resource = `${string}://${string}`;

/** end Utility Types */

export function toJsonSafe<T extends object>(data: T): object {
  if (typeof data !== "object") {
    throw new Error("Data is not an object");
  }

  function convert(value: unknown): unknown {
    if (value !== null && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([key, val]) => [key, convert(val)]));
    }

    if (Array.isArray(value)) {
      return value.map(convert);
    }

    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  }

  return convert(data) as object;
}
