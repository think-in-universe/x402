import { describe, it, expect, vi, beforeEach } from 'vitest'
import { configurePaymentMiddleware } from './index'
import { Context, Hono } from 'hono'
import { useFacilitator } from 'x402/verify'
import { getPaywallHtml, getNetworkId } from 'x402/shared'
import { getUsdcAddressForChain } from 'x402/shared/evm'
import { Money, GlobalConfig, PaymentMiddlewareConfig } from 'x402/types'

// Mock dependencies
vi.mock('x402/verify', () => ({
  useFacilitator: vi.fn()
}))

vi.mock('x402/shared', () => ({
  getPaywallHtml: vi.fn(),
  getNetworkId: vi.fn().mockReturnValue('base-sepolia'),
  toJsonSafe: vi.fn(x => x)
}))

vi.mock('x402/shared/evm', () => ({
  getUsdcAddressForChain: vi.fn().mockReturnValue('0x036CbD53842c5426634e7929541eC2318f3dCF7e')
}))

describe('configurePaymentMiddleware()', () => {
  let mockContext: Context
  let mockNext: () => Promise<void>
  let middleware: ReturnType<ReturnType<(typeof configurePaymentMiddleware)>>
  let mockVerify: ReturnType<typeof useFacilitator>['verify']
  let mockSettle: ReturnType<typeof useFacilitator>['settle']
  let app: Hono

  const globalConfig: GlobalConfig = {
    facilitatorUrl: 'https://facilitator.example.com',
    address: '0x1234567890123456789012345678901234567890',
    network: 'base-sepolia'
  }

  const middlewareConfig: PaymentMiddlewareConfig = {
    description: 'Test payment',
    mimeType: 'application/json',
    maxTimeoutSeconds: 300,
    outputSchema: { type: 'object' },
    resource: 'https://api.example.com/resource'
  }

  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks()

    // Setup Hono app
    app = new Hono()

    // Setup context mock
    mockContext = {
      req: {
        url: '/test',
        header: vi.fn(),
        headers: new Headers()
      },
      res: {
        status: 200,
        headers: new Headers()
      },
      header: vi.fn(),
      json: vi.fn(),
      html: vi.fn()
    } as unknown as Context

    // Setup next function mock
    mockNext = vi.fn()

    // Setup facilitator mocks
    mockVerify = vi.fn() as any
    mockSettle = vi.fn() as any
    (useFacilitator as any).mockReturnValue({
      verify: mockVerify,
      settle: mockSettle
    });

    // Setup paywall HTML mock
    (getPaywallHtml as any).mockReturnValue('<html>Paywall</html>');

    // Create middleware
    middleware = configurePaymentMiddleware(globalConfig)(1.0, middlewareConfig)
  })

  it('should return 402 with payment requirements when no payment header is present', async () => {
    (mockContext.req.header as any).mockImplementation((name: string) => {
      if (name === 'Accept') return 'application/json'
      return undefined
    });

    await middleware(mockContext, mockNext)

    expect(mockContext.json).toHaveBeenCalledWith(
      {
        error: 'X-PAYMENT header is required',
        paymentRequirements: expect.any(Object)
      },
      402
    )
  })

  it('should return HTML paywall for browser requests', async () => {
    (mockContext.req.header as any).mockImplementation((name: string) => {
      if (name === 'Accept') return 'text/html'
      if (name === 'User-Agent') return 'Mozilla/5.0'
      return undefined
    })

    await middleware(mockContext, mockNext)

    expect(mockContext.html).toHaveBeenCalledWith('<html>Paywall</html>', 402)
  })

  it('should verify payment and proceed if valid', async () => {
    const validPayment = 'valid-payment-header';
    (mockContext.req.header as any).mockImplementation((name: string) => {
      if (name === 'X-PAYMENT') return validPayment
      return undefined
    });

    (mockVerify as any).mockResolvedValue({ isValid: true });

    await middleware(mockContext, mockNext)

    expect(mockVerify).toHaveBeenCalledWith(validPayment, expect.any(Object))
    expect(mockNext).toHaveBeenCalled()
  })

  it('should return 402 if payment verification fails', async () => {
    const invalidPayment = 'invalid-payment-header';
    (mockContext.req.header as any).mockImplementation((name: string) => {
      if (name === 'X-PAYMENT') return invalidPayment
      return undefined
    });

    (mockVerify as any).mockResolvedValue({
      isValid: false,
      invalidReason: 'insufficient_funds'
    });

    await middleware(mockContext, mockNext)

    expect(mockContext.json).toHaveBeenCalledWith(
      {
        error: 'insufficient_funds',
        paymentRequirements: expect.any(Object)
      },
      402
    )
  })

  it('should handle settlement after response', async () => {
    const validPayment = 'valid-payment-header';
    (mockContext.req.header as any).mockImplementation((name: string) => {
      if (name === 'X-PAYMENT') return validPayment;
      return undefined;
    });

    (mockVerify as any).mockResolvedValue({ isValid: true });
    (mockSettle as any).mockResolvedValue({
      success: true,
      transaction: '0x123',
      network: 'base-sepolia'
    });

    // Mock the json method to simulate response already sent
    const originalJson = mockContext.json;
    mockContext.json = vi.fn().mockImplementation(() => {
      throw new Error('Response already sent');
    });

    await middleware(mockContext, mockNext);

    expect(mockSettle).toHaveBeenCalledWith(validPayment, expect.any(Object));
    expect(mockContext.header).toHaveBeenCalledWith(
      'X-PAYMENT-RESPONSE',
      expect.any(String)
    );
    // Restore original json method
    mockContext.json = originalJson;
  });

  it('should handle settlement failure before response is sent', async () => {
    const validPayment = 'valid-payment-header';
    (mockContext.req.header as any).mockImplementation((name: string) => {
      if (name === 'X-PAYMENT') return validPayment
      return undefined
    });

    (mockVerify as any).mockResolvedValue({ isValid: true });
    (mockSettle as any).mockRejectedValue(new Error('Settlement failed'));

    await middleware(mockContext, mockNext)

    expect(mockContext.json).toHaveBeenCalledWith(
      {
        error: expect.any(Error),
        paymentRequirements: expect.any(Object)
      },
      402
    )
  })
})