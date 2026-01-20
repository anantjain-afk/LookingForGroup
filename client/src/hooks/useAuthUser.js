import { useEffect } from "react";
import { useUserStore } from "../store/useUserStore";
import { apiGet } from "../api/client";

/**
 * Custom hook to fetch and persist the current authenticated user
 * Runs on app initialization
 */
export const useAuthUser = () => {
  const setUser = useUserStore((state) => state.setUser);
  const setLoading = useUserStore((state) => state.setLoading);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const data = await apiGet("/api/me");
        setUser(data);
      } catch (error) {
        // User is not authenticated, clear user state
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [setUser, setLoading]);
};
