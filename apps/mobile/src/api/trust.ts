import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ComplaintDto,
  CreateComplaintBody,
  CreateGuaranteeClaimBody,
  CreateReviewBody,
  JobDto,
  MasterPublicDto,
} from '@usta/shared';
import { api } from './client';

/** After a trust action the job changes (review, claims): store the fresh job in the cache. */
function useJobUpdate(jobId: string) {
  const queryClient = useQueryClient();
  return (job: JobDto) => {
    queryClient.setQueryData(['jobs', jobId], job);
    void queryClient.invalidateQueries({ queryKey: ['jobs'], exact: true });
  };
}

export function useCreateReview(jobId: string) {
  const onSuccess = useJobUpdate(jobId);
  return useMutation({
    mutationFn: (body: CreateReviewBody) =>
      api<JobDto>(`/jobs/${jobId}/review`, { method: 'POST', body }),
    onSuccess,
  });
}

export function useCreateGuaranteeClaim(jobId: string) {
  const onSuccess = useJobUpdate(jobId);
  return useMutation({
    mutationFn: (body: CreateGuaranteeClaimBody) =>
      api<JobDto>(`/jobs/${jobId}/guarantee-claims`, { method: 'POST', body }),
    onSuccess,
  });
}

export function useMyComplaints(jobId: string) {
  return useQuery({
    queryKey: ['jobs', jobId, 'complaints'],
    queryFn: () => api<ComplaintDto[]>(`/jobs/${jobId}/complaints`),
  });
}

export function useCreateComplaint(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateComplaintBody) =>
      api<ComplaintDto>(`/jobs/${jobId}/complaints`, { method: 'POST', body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobs', jobId, 'complaints'] }),
  });
}

export function useMasterPage(masterId: string) {
  return useQuery({
    queryKey: ['masters', masterId],
    queryFn: () => api<MasterPublicDto>(`/masters/${masterId}`, { auth: false }),
    staleTime: 5 * 60_000,
  });
}
