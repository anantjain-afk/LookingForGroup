import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUserStore } from '../store/useUserStore';
import { apiGet } from '../api/client';

export function useAuthUser() {
  const setUser = useUserStore(state => state.setUser);
  const setLoading = useUserStore(state => state.setLoading);
  const setError = useUserStore(state => state.setError);
  const query = useQuery({ queryKey: ['auth', 'me'], queryFn: async () => {
    try { return await apiGet('/api/me'); } catch (error) { if (error.status === 401) return null; throw error; }
  }, staleTime: 60_000, retry: (count, error) => error.status !== 401 && count < 1 });
  useEffect(() => {
    setLoading(query.isPending);
    if (query.isSuccess) { setUser(query.data); setError(null); }
    else if (query.isError) setError(query.error.message);
  }, [query.isPending, query.isSuccess, query.isError, query.data, query.error, setLoading, setUser, setError]);
  return query;
}
