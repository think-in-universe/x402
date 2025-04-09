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