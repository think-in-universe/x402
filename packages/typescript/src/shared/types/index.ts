/** This files looks a little complicated because we're using zod to get proper parsing & validation for types over the wire
 * The important bits:
 *
 * `PaymentPayloadV1`: the current version of the payment protocol, and is sent as a header in requests by the client
 *
 * `PaymentNeededDetails`: the response from the server to the client, it includes the details of the resource that the client is requesting access to.
 *
 * `PaymentExecutionResponse`: the response from the facilitator to the resource server, it includes the details of the payment that was executed.
 *
 * `ValidPaymentResponse`: the response from the facilitator to the resource server, it tells the resource server if the request is valid or not.
 */

import { Address, Hex } from "viem";
import { z } from "zod";

/**
 * Generic payment protocol wrapper across schema versions
 * @param payloadSchema - schema of the payload
 * @returns - wrapper zod object with version and payload
 */
const paymentPayloadSchema = <T extends z.ZodType>(payloadSchema: T) =>
  z.object({
    version: z.number(),
    payload: payloadSchema,
    resource: z.string().regex(/^[^:]+:\/\/.+$/) as z.ZodType<Resource>,
  });

export const authorizationParametersSchema = z.object({
  from: z.custom<Address>(),
  to: z.custom<Address>(),
  value: z.bigint(),
  validAfter: z.bigint(),
  validBefore: z.bigint(),
  nonce: z.custom<Hex>(),
  chainId: z.number(),
  version: z.string(),
  usdcAddress: z.custom<Address>(),
});

export type AuthorizationParameters = z.infer<
  typeof authorizationParametersSchema
>;

export const payloadV1Schema = z.object({
  signature: z.custom<AuthorizationSignature>(),
  params: authorizationParametersSchema,
});

export type PayloadV1 = z.infer<typeof payloadV1Schema>;

/**
 * Version 1 of payments protocol payload that is included in a header of requests
 * @property {number} version - Version number of the payload format
 * @property {PayloadV1} payload - v1 of the protocol uses a permit signature and the signed values of the payload
 * to faciliate fast and gasless payments for users.
 * @property {Resource} resource - Resource identifier, ex: https://api.example.com/v1/payments
 */
export const paymentPayloadV1Schema = paymentPayloadSchema(payloadV1Schema);
export type PaymentPayloadV1 = z.infer<typeof paymentPayloadV1Schema>;

export type Resource = `${string}://${string}`;

export const paymentNeededDetailsSchema = z.object({
  // version of the payment protocol
  version: z.number(),
  // max amount required to pay for the resource
  maxAmountRequired: z.bigint(),
  // resource identifier
  resource: z.string().regex(/^[^:]+:\/\/.+$/) as z.ZodType<Resource>,
  // description of the resource
  description: z.string(),
  // mime type of the resource response
  mimeType: z.string(),
  // output schema of the resource
  outputSchema: z.object({}).nullable(),
  // address to pay value for access to the resource
  resourceAddress: z.custom<Address>(),
  // time in seconds it may before payment can be settled (how long the resource server needs to process the payment)
  requiredDeadlineSeconds: z.number(),
  // address of the USDC contract
  usdcAddress: z.custom<Address>(),
  // chain id of the chain to send payment on
  chainId: z.number(),
});

export type PaymentNeededDetails = z.infer<typeof paymentNeededDetailsSchema>;

export type AuthorizationSignature = Hex;

export type PaymentExecutionResponse = {
  success: boolean;
  error?: string | undefined;
  txHash?: Hex | undefined;
  networkId?: string | undefined;
};

// Verifier
export type ValidPaymentResponse = {
  isValid: boolean;
  invalidReason?: string | undefined;
};

export const moneySchema = z
  .union([z.string().transform((x) => x.replace(/[^0-9.-]+/g, "")), z.number()])
  .pipe(z.coerce.number().min(0.0001).max(999999999));

export type Money = z.input<typeof moneySchema>;
