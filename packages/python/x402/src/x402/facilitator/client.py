

class FacilitatorClient:
    def __init__(self, url: str):
        self.url = url

    async def verify(self, payment: str, payment_details: dict) -> dict:
        pass
