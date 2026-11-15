import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreatePriceChangeBody, CustomerOfferDto, JobDto, JobStatusBody } from '@usta/shared';
import { api } from './client';

export function useOffers(requestId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['requests', requestId, 'offers'],
    queryFn: () => api<CustomerOfferDto[]>(`/requests/${requestId}/offers`),
    enabled,
    // New offers arrive while the customer is looking.
    refetchInterval: 20_000,
  });
}

export function useAcceptOffer(requestId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (offerId: string) =>
      api<JobDto>(`/requests/${requestId}/offers/${offerId}/accept`, { method: 'POST' }),
    onSuccess: (job) => {
      queryClient.setQueryData(['jobs', job.id], job);
      void queryClient.invalidateQueries({ queryKey: ['requests'] });
      void queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
}

export function useJobs() {
  return useQuery({ queryKey: ['jobs'], queryFn: () => api<JobDto[]>('/jobs') });
}

export function useJob(id: string) {
  return useQuery({
    queryKey: ['jobs', id],
    queryFn: () => api<JobDto>(`/jobs/${id}`),
    // "What is happening now": keep the status fresh.
    refetchInterval: 20_000,
  });
}

/** All job actions return the updated job; we put it straight into the cache. */
function useJobAction<TVars>(id: string, call: (vars: TVars) => Promise<JobDto>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: call,
    onSuccess: (job) => {
      queryClient.setQueryData(['jobs', id], job);
      void queryClient.invalidateQueries({ queryKey: ['jobs'], exact: true });
      void queryClient.invalidateQueries({ queryKey: ['requests'] });
    },
  });
}

export const useJobStatus = (id: string) =>
  useJobAction(id, (body: JobStatusBody) =>
    api<JobDto>(`/jobs/${id}/status`, { method: 'POST', body }),
  );

export const useCancelJob = (id: string) =>
  useJobAction(id, (reason?: string) =>
    api<JobDto>(`/jobs/${id}/cancel`, { method: 'POST', body: { reason } }),
  );

export const useProposePrice = (id: string) =>
  useJobAction(id, (body: CreatePriceChangeBody) =>
    api<JobDto>(`/jobs/${id}/price-changes`, { method: 'POST', body }),
  );

export const useAnswerPrice = (id: string) =>
  useJobAction(id, ({ pcId, approve }: { pcId: string; approve: boolean }) =>
    api<JobDto>(`/jobs/${id}/price-changes/${pcId}/${approve ? 'approve' : 'decline'}`, {
      method: 'POST',
    }),
  );
