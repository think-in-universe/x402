import { AxiosInstance, AxiosError } from "axios";
import { PaymentRequirements, PaymentRequirementsSchema } from "../types";
import { evm } from "../shared";
import { createPaymentHeader } from "../client";

export function withPaymentInterceptor(
  axiosClient: AxiosInstance,
  walletClient: evm.wallet.SignerWallet,
) {
  axiosClient.interceptors.response.use(
    response => response,
    async (error: AxiosError) => {
      if (!error.response || error.response.status !== 402) {
        return Promise.reject(error);
      }

      try {
        const { paymentRequirements } = error.response.data as { paymentRequirements: PaymentRequirements[] };
        const parsedPaymentRequirements = paymentRequirements.map(x => PaymentRequirementsSchema.parse(x));

        // TODO: Improve selection between multiple payment requirements
        const selectedPaymentRequirements = parsedPaymentRequirements[0];

        const paymentHeader = await createPaymentHeader(walletClient, selectedPaymentRequirements);

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
