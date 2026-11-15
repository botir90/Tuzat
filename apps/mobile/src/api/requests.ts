import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateRequestBody, RequestDto } from '@usta/shared';
import { api } from './client';

export function useMyRequests(enabled = true) {
  return useQuery({
    queryKey: ['requests', 'mine'],
    queryFn: () => api<RequestDto[]>('/requests/mine'),
    enabled,
  });
}

export function useRequest(id: string) {
  return useQuery({
    queryKey: ['requests', id],
    queryFn: () => api<RequestDto>(`/requests/${id}`),
    // Statuses change while the customer waits for offers: check every 30 s.
    refetchInterval: 30_000,
  });
}

export function useCreateRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateRequestBody) => api<RequestDto>('/requests', { method: 'POST', body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['requests'] }),
  });
}

export function useCancelRequest(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<RequestDto>(`/requests/${id}/cancel`, { method: 'POST' }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['requests', id], updated);
      void queryClient.invalidateQueries({ queryKey: ['requests', 'mine'] });
    },
  });
}
