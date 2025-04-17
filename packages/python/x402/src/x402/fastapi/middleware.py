from typing import Optional, Any
from fastapi import Request, Response
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel
from decimal import Decimal
import json
from urllib.parse import urlparse

class PaymentDetails(BaseModel):
    scheme: str
    networkId: str
    maxAmountRequired: int
    resource: str
    description: str
    mimeType: str
    payToAddress: str
    requiredDeadlineSeconds: int
    usdcAddress: str
    outputSchema: Optional[Any]
    extra: Optional[Any]

def get_usdc_address(chain_id: int) -> str:
    """Get the USDC contract address for a given chain ID"""
    if chain_id == 84532:  # Base Sepolia testnet
        return "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
    elif chain_id == 8453:  # Base mainnet
        return "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
    raise ValueError(f"Unsupported chain ID: {chain_id}")

def parse_money(amount: str | float) -> Decimal:
    """Parse money string or float into Decimal"""
    if isinstance(amount, str):
        if amount.startswith("$"):
            amount = amount[1:]
        return Decimal(amount)
    return Decimal(str(amount))

def payment_middleware(
    amount: str | float,
    address: str,
    description: str = "",
    mime_type: str = "",
    max_deadline_seconds: int = 60,
    output_schema: Any = None,
    facilitator_url: str = "https://x402.org/facilitator",
    testnet: bool = True,
    custom_paywall_html: str = "",
    resource: Optional[str] = None
):
    try:
        parsed_amount = parse_money(amount)
    except:
        raise ValueError(f"Invalid amount: {amount}. Must be in the form '$3.10', 0.10, '0.001'")

    async def middleware(request: Request, call_next):
        # Get resource URL if not explicitly provided
        resource_url = resource or str(request.url)

        # Construct payment details
        payment_details = PaymentDetails(
            scheme="exact",
            networkId="84532" if testnet else "8453",
            maxAmountRequired=int(parsed_amount * 10**6),
            resource=resource_url,
            description=description,
            mimeType=mime_type,
            payToAddress=address,
            requiredDeadlineSeconds=max_deadline_seconds,
            usdcAddress=get_usdc_address(84532 if testnet else 8453),
            outputSchema=output_schema,
            extra=None
        )

        # Check for payment header
        payment = request.headers.get("X-PAYMENT")
        user_agent = request.headers.get("User-Agent", "")
        accept = request.headers.get("Accept", "")
        is_web_browser = "text/html" in accept and "Mozilla" in user_agent

        if not payment:
            if is_web_browser:
                # Return HTML paywall for browser requests
                from x402.shared.paywall import get_paywall_html
                html = custom_paywall_html or get_paywall_html(
                    amount=float(parsed_amount),
                    payment_details=payment_details.model_dump(mode="json"),
                    current_url=str(request.url),
                    testnet=testnet
                )
                return HTMLResponse(content=html, status_code=402)
            
            # Return JSON response for API requests
            return JSONResponse(
                content={
                    "error": "X-PAYMENT header is required",
                    "paymentDetails": payment_details.model_dump(mode="json")
                },
                status_code=402
            )

        # Verify payment
        from x402.client import use_facilitator
        facilitator = use_facilitator(facilitator_url)
        verify_response = await facilitator.verify(payment, payment_details.model_dump(mode="json"))

        if not verify_response["isValid"]:
            return JSONResponse(
                content={
                    "error": verify_response["invalidReason"],
                    "paymentDetails": payment_details.model_dump(mode="json")
                },
                status_code=402
            )

        # Process the request
        response = await call_next(request)

        # Settle the payment
        try:
            settle_response = await facilitator.settle(payment, payment_details.model_dump(mode="json"))
            response.headers["X-PAYMENT-RESPONSE"] = json.dumps(settle_response)
        except Exception as e:
            return JSONResponse(
                content={
                    "error": str(e),
                    "paymentDetails": payment_details.model_dump(mode="json")
                },
                status_code=402
            )

        return response

    return middleware
