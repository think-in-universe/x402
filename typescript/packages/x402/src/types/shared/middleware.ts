import { Hex } from "viem"
import { Network } from "./network"
import { Resource } from "./resource"


export type GlobalConfig = {
  facilitatorUrl?: string,
  address: Hex,
  network: Network
}

export type PaymentMiddlewareConfig = {
  amount: `$${number}`,
  description?: string,
  mimeType?: string,
  maxTimeoutSeconds?: number,
  outputSchema?: object,
  customPaywallHtml?: string,
  resource?: Resource
}