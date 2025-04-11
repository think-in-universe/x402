import { AxiosInstance, AxiosError } from "axios";
import { PaymentRequirementsSchema } from "x402/types";
import { evm } from "x402/types";
import { createPaymentHeader } from "x402/client";

export function withPaymentInterceptor(
  axiosClient: AxiosInstance,
  walletClient: typeof evm.SignerWallet,
) {
  axiosClient.interceptors.response.use(
    response => response,
    async (error: AxiosError) => {
      if (!error.response || error.response.status !== 402) {
        return Promise.reject(error);
      }

      try {
        const { paymentRequirements } = error.response.data as any;
        const parsed = PaymentRequirementsSchema.parse(paymentRequirements);

        const paymentHeader = await createPaymentHeader(walletClient, parsed);

        const originalConfig = error.config;
        if (!originalConfig || !originalConfig.headers) {
          return Promise.reject(new Error("Missing axios request configuration"));
        }

        if ((originalConfig as any).__is402Retry) {
          return Promise.reject(error);
        }

        (originalConfig as any).__is402Retry = true;

        originalConfig.headers["X-PAYMENT"] = paymentHeader;
        originalConfig.headers["Access-Control-Expose-Headers"] = "X-PAYMENT-RESPONSE";

        const secondResponse = await axiosClient.request(originalConfig);
        return secondResponse;
      } catch (paymentError) {
        return Promise.reject(paymentError);
      }
    },
  );

  return axiosClient;
}
