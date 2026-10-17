import { Navigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useUserStore } from '../store/useUserStore';
export default function ProtectedRoute({ children }) {
  const { user, isLoading, error } = useUserStore();
  const location = useLocation();
  const queryClient = useQueryClient();
  if (isLoading) return <div className="min-h-[60vh] grid place-items-center text-gray-400">Checking your session…</div>;
  if (!user && error) return <div className="min-h-[60vh] grid place-items-center text-gray-300"><div className="text-center"><p>{error}</p><button className="mt-4 text-emerald-400" onClick={() => queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })}>Retry connection</button></div></div>;
  if (!user) return <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return children;
}
