import { useMutation, useQuery } from '@tanstack/react-query'
import axios from 'axios'

const BASE = '/api'

export function useExample() {
  return useQuery({
    queryKey: ['example'],
    queryFn: () => axios.get(`${BASE}/predict/example`).then(r => r.data),
    staleTime: Infinity,
  })
}

export function usePrediction() {
  return useMutation({
    mutationFn: (features) =>
      axios.post(`${BASE}/predict`, features).then(r => r.data),
  })
}

export function useCohort(segmentKey) {
  return useQuery({
    queryKey: ['cohort', segmentKey],
    queryFn: () => axios.get(`${BASE}/cohort/${segmentKey}`).then(r => r.data),
    enabled: !!segmentKey,
    staleTime: Infinity,
  })
}

export function useModelInfo() {
  return useQuery({
    queryKey: ['modelInfo'],
    queryFn: () => axios.get(`${BASE}/model/info`).then(r => r.data),
    staleTime: Infinity,
  })
}
