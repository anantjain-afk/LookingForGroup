import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiPost } from '../api/client';
import { useUserStore } from '../store/useUserStore';
import GoogleSignInButton from './GoogleSignInButton';
export default function AccountSettings() {
  const { user, setUser } = useUserStore();
  const client = useQueryClient();
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  async function link(credential) {
    setBusy(true);
    try {
      const result = await apiPost('/api/auth/google/link', { credential, password });
      client.setQueryData(['auth', 'me'], result.user); setUser(result.user); setPassword(''); setMessage('Google connected.');
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }
  return <section className="bg-[#151515] border border-gray-800 rounded-xl p-5 space-y-3"><h2 className="font-bold">Sign-in methods</h2>{user.googleLinked ? <p className="text-emerald-400 text-sm">Google connected</p> : <><p className="text-gray-400 text-sm">Connect Google using the same email and your current password.</p><input aria-label="Current password to connect Google" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className="bg-gray-800 rounded p-2 w-full" placeholder="Current password" /><GoogleSignInButton onCredential={link} disabled={busy || !password} /></>}{message && <p role="status" className="text-sm text-gray-300">{message}</p>}</section>;
}
