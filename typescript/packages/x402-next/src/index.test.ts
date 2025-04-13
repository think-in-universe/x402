import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPaywallHtml } from "x402/shared";
import { GlobalConfig, PaymentMiddlewareConfig } from "x402/types";
import { useFacilitator } from "x402/verify";
import { createPaymentMiddleware } from "./index";

// Mock dependencies
vi.mock("x402/verify", () => ({
  useFacilitator: vi.fn(),
}));

vi.mock("x402/shared", () => ({
  getPaywallHtml: vi.fn(),
  getNetworkId: vi.fn().mockReturnValue("base-sepolia"),
  toJsonSafe: vi.fn(x => x),
}));

vi.mock("x402/shared/evm", () => ({
  getUsdcAddressForChain: vi.fn().mockReturnValue("0x036CbD53842c5426634e7929541eC2318f3dCF7e"),
}));

describe("createPaymentMiddleware()", () => {
  let mockRequest: NextRequest;
  let middleware: ReturnType<typeof createPaymentMiddleware>;
  let mockVerify: ReturnType<typeof useFacilitator>["verify"];
  let mockSettle: ReturnType<typeof useFacilitator>["settle"];

  const globalConfig: GlobalConfig = {
    facilitatorUrl: "https://facilitator.example.com",
    address: "0x1234567890123456789012345678901234567890",
    network: "base-sepolia",
  };

  const middlewareConfig: PaymentMiddlewareConfig = {
    description: "Test payment",
    mimeType: "application/json",
    maxTimeoutSeconds: 300,
    outputSchema: { type: "object" },
    resource: "https://api.example.com/resource",
  };

  beforeEach(() => {
    vi.resetAllMocks();

    // Setup request mock
    mockRequest = {
      nextUrl: {
        pathname: "/protected/test",
        protocol: "https:",
        host: "example.com",
      },
      headers: new Headers(),
    } as unknown as NextRequest;

    // Setup facilitator mocks
    mockVerify = vi.fn() as ReturnType<typeof useFacilitator>["verify"];
    mockSettle = vi.fn() as ReturnType<typeof useFacilitator>["settle"];
    (useFacilitator as ReturnType<typeof vi.fn>).mockReturnValue({
      verify: mockVerify,
      settle: mockSettle,
    });

    // Setup paywall HTML mock
    (getPaywallHtml as ReturnType<typeof vi.fn>).mockReturnValue("<html>Paywall</html>");

    // Create middleware with test routes
    middleware = createPaymentMiddleware({
      ...globalConfig,
      routes: {
        "/protected/*": {
          amount: 1.0,
          config: middlewareConfig,
        },
      },
    });
  });

  it("should return next() when no route matches", async () => {
    mockRequest.nextUrl.pathname = "/unprotected/test";
    const response = await middleware(mockRequest);
    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(200);
  });

  it("should return 402 with payment requirements when no payment header is present", async () => {
    mockRequest.headers.set("Accept", "application/json");
    const response = await middleware(mockRequest);

    expect(response.status).toBe(402);
    const json = await response.json();
    expect(json).toEqual({
      error: "X-PAYMENT header is required",
      paymentRequirements: expect.any(Object),
    });
  });

  it("should return HTML paywall for browser requests", async () => {
    mockRequest.headers.set("Accept", "text/html");
    mockRequest.headers.set("User-Agent", "Mozilla/5.0");
    const response = await middleware(mockRequest);

    expect(response.status).toBe(402);
    expect(response.headers.get("Content-Type")).toBe("text/html");
    const html = await response.text();
    expect(html).toBe("<html>Paywall</html>");
  });

  it("should verify payment and proceed if valid", async () => {
    const validPayment = "valid-payment-header";
    mockRequest.headers.set("X-PAYMENT", validPayment);
    (mockVerify as ReturnType<typeof vi.fn>).mockResolvedValue({ isValid: true });
    (mockSettle as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      transaction: "0x123",
      network: "base-sepolia",
    });

    const response = await middleware(mockRequest);

    expect(mockVerify).toHaveBeenCalledWith(validPayment, expect.any(Object));
    expect(response.status).toBe(200); // The middleware returns 200 for valid payments
    expect(response.headers.get("X-PAYMENT-RESPONSE")).toBeDefined();
  });

  it("should return 402 if payment verification fails", async () => {
    const invalidPayment = "invalid-payment-header";
    mockRequest.headers.set("X-PAYMENT", invalidPayment);
    (mockVerify as ReturnType<typeof vi.fn>).mockResolvedValue({
      isValid: false,
      invalidReason: "insufficient_funds",
    });

    const response = await middleware(mockRequest);

    expect(response.status).toBe(402);
    const json = await response.json();
    expect(json).toEqual({
      error: "insufficient_funds",
      paymentRequirements: expect.any(Object),
    });
  });

  it("should handle settlement after response", async () => {
    const validPayment = "valid-payment-header";
    mockRequest.headers.set("X-PAYMENT", validPayment);
    (mockVerify as ReturnType<typeof vi.fn>).mockResolvedValue({ isValid: true });
    (mockSettle as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      transaction: "0x123",
      network: "base-sepolia",
    });

    const response = await middleware(mockRequest);

    expect(mockSettle).toHaveBeenCalledWith(validPayment, expect.any(Object));
    expect(response.headers.get("X-PAYMENT-RESPONSE")).toBeDefined();
  });

  it("should handle settlement failure", async () => {
    const validPayment = "valid-payment-header";
    mockRequest.headers.set("X-PAYMENT", validPayment);
    (mockVerify as ReturnType<typeof vi.fn>).mockResolvedValue({ isValid: true });
    (mockSettle as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Settlement failed"));

    const response = await middleware(mockRequest);

    expect(response.status).toBe(402);
    const json = await response.json();
    expect(json).toEqual({
      error: expect.any(Object),
      paymentRequirements: expect.any(Object),
    });
  });

  it("should handle invalid payment amount configuration", async () => {
    middleware = createPaymentMiddleware({
      ...globalConfig,
      routes: {
        "/protected/*": {
          amount: "invalid",
          config: middlewareConfig,
        },
      },
    });

    const response = await middleware(mockRequest);

    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).toBe("Invalid payment configuration");
  });
});
