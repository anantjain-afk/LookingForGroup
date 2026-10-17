import { useState } from 'react';
import { useUserStore } from '../store/useUserStore';
import { apiPost } from '../api/client';
export default function AuthBanner() {
  const { user, error } = useUserStore();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function resend() {
    setBusy(true);
    try { const result = await apiPost('/api/auth/verification/resend'); setMessage(result.message); }
    catch (err) { setMessage(err.message); } finally { setBusy(false); }
  }
  if (error) return <div role="status" className="px-5 py-2 bg-amber-950 text-amber-200 text-sm">Connection interrupted. Your session will be checked again when the server responds.</div>;
  if (!user || user.emailVerifiedAt) return null;
  return <div role="status" className="px-5 py-3 bg-amber-950 text-amber-200 text-sm flex flex-wrap items-center gap-3"><span>{message || 'Verify your email to join and host lobbies.'}</span><button className="underline disabled:opacity-50" disabled={busy} onClick={resend}>{busy ? 'Sending…' : 'Resend verification'}</button></div>;
}
