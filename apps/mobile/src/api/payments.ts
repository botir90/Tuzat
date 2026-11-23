import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ChoosePaymentBody,
  CreatePartsReceiptBody,
  MasterBalanceDto,
  PaymentDto,
} from '@usta/shared';
import { api } from './client';

const paymentKey = (jobId: string) => ['jobs', jobId, 'payment'] as const;

export function usePayment(jobId: string, enabled = true) {
  return useQuery({
    queryKey: paymentKey(jobId),
    queryFn: () => api<PaymentDto>(`/jobs/${jobId}/payment`),
    enabled,
  });
}

/** Every payment action returns the new payment; the job may have changed too. */
function usePaymentAction<TVars>(jobId: string, run: (vars: TVars) => Promise<PaymentDto>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: (payment) => {
      queryClient.setQueryData(paymentKey(jobId), payment);
      void queryClient.invalidateQueries({ queryKey: ['jobs', jobId], exact: true });
      void queryClient.invalidateQueries({ queryKey: ['master', 'earnings'] });
    },
  });
}

export const useChoosePayment = (jobId: string) =>
  usePaymentAction(jobId, (body: ChoosePaymentBody) =>
    api<PaymentDto>(`/jobs/${jobId}/payment`, { method: 'POST', body }),
  );

export const useConfirmJob = (jobId: string) =>
  usePaymentAction(jobId, () => api<PaymentDto>(`/jobs/${jobId}/confirm`, { method: 'POST' }));

export const useAddReceipt = (jobId: string) =>
  usePaymentAction(jobId, (body: CreatePartsReceiptBody) =>
    api<PaymentDto>(`/jobs/${jobId}/parts-receipts`, { method: 'POST', body }),
  );

export const useAnswerReceipt = (jobId: string) =>
  usePaymentAction(jobId, ({ receiptId, approve }: { receiptId: string; approve: boolean }) =>
    api<PaymentDto>(
      `/jobs/${jobId}/parts-receipts/${receiptId}/${approve ? 'approve' : 'reject'}`,
      { method: 'POST' },
    ),
  );

export function useMasterBalance() {
  return useQuery({
    queryKey: ['master', 'balance'],
    queryFn: () => api<MasterBalanceDto>('/master/balance'),
  });
}
