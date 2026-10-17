import { useUserStore } from '../store/useUserStore';
// Authentication is fetched once by App's useAuthUser hook.
export const useAuth = () => useUserStore();
