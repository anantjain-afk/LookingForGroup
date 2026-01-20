import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../api/client.js";
import { useUserStore } from "../store/useUserStore.js";
import { useEffect } from "react";

/**
 * useAuth Hook
 * Fetches current user data from /api/me using TanStack Query
 * Syncs fetched user data with Zustand store
 *
 * @returns {Object} Query result and store data
 *   - user: Current user object
 *   - isLoading: Whether the query is loading
 *   - isError: Whether the query encountered an error
 *   - error: Error object if query failed
 *   - refetch: Function to manually refetch user data
 */
export const useAuth = () => {
  const { user, setUser, setLoading, setError, clearUser } = useUserStore();

  // Fetch user data using TanStack Query
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => apiGet("/api/me"),
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    retry: 1,
    throwOnError: false,
  });

  // Sync TanStack Query state with Zustand store
  useEffect(() => {
    setLoading(isLoading || isFetching);
  }, [isLoading, isFetching, setLoading]);

  useEffect(() => {
    if (data) {
      setUser(data);
      setError(null);
    }
  }, [data, setUser, setError]);

  useEffect(() => {
    if (isError && error) {
      setError(error.message);
      clearUser();
    }
  }, [isError, error, setError, clearUser]);

  return {
    user,
    isLoading: isLoading || isFetching,
    isError,
    error,
    refetch,
  };
};
