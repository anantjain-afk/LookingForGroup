import { create } from "zustand";

/**
 * User Store
 * Holds global user state across the application
 */
export const useUserStore = create((set) => ({
  user: null,
  isLoading: true,
  error: null,

  // Set user data
  setUser: (user) => set({ user }),

  // Clear user data (logout)
  clearUser: () => set({ user: null, error: null }),

  // Set loading state
  setLoading: (isLoading) => set({ isLoading }),

  // Set error state
  setError: (error) => set({ error }),

  // Update user fields
  updateUser: (updates) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...updates } : null,
    })),
}));
