import { z } from "zod";
import { Address, Hex } from "viem";

export type AuthorizationSignature = Hex;

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
