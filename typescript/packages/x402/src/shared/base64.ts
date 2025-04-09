export function safeBase64Encode(data: string): string {
  return Buffer.from(data).toString("base64");
}

export function safeBase64Decode(data: string): string {
  return Buffer.from(data, "base64").toString("utf-8");
}
