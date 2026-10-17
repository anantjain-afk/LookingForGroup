import { useCallback, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { apiPost } from '../api/client';
import { useUserStore } from '../store/useUserStore';
import GoogleSignInButton from '../components/GoogleSignInButton';

function safeReturnTo(value) { return value?.startsWith('/') && !value.startsWith('//') && !value.includes('\\') ? value : '/'; }
export default function AuthPage({ mode = 'login' }) {
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token] = useState(() => window.location.hash.slice(1));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const client = useQueryClient();
  const setUser = useUserStore(state => state.setUser);
  const returnTo = safeReturnTo(params.get('returnTo'));
  const establish = useCallback(async data => {
    await client.cancelQueries({ queryKey: ['auth', 'me'] });
    client.setQueryData(['auth', 'me'], data.user); setUser(data.user);
    navigate(returnTo, { replace: true });
  }, [client, navigate, returnTo, setUser]);
  const onGoogle = useCallback(async credential => {
    setBusy(true); setError('');
    try { await establish(await apiPost('/api/auth/google', { credential })); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }, [establish]);
  const title = { login: 'Welcome back', register: 'Find your squad', forgot: 'Recover your account', reset: 'Set a new password', verify: 'Verify your email' }[mode];
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      if (mode === 'login' || mode === 'register') await establish(await apiPost(`/api/auth/${mode}`, { email, password, ...(mode === 'register' ? { username } : {}) }));
      else {
        const endpoint = { forgot: 'forgot-password', reset: 'reset-password', verify: 'verify-email' }[mode];
        const result = await apiPost(`/api/auth/${endpoint}`, { email, password, token });
        setMessage(result.message);
        if (mode === 'verify') await client.invalidateQueries({ queryKey: ['auth', 'me'] });
        if (mode === 'reset') { client.setQueryData(['auth', 'me'], null); setUser(null); }
        if (mode !== 'forgot') window.history.replaceState(null, '', window.location.pathname);
      }
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  const input = 'w-full bg-[#1d1f24] border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:outline-none';
  return <main className="min-h-[80vh] flex items-center justify-center p-6 bg-[#0a0a0a] text-white"><div className="w-full max-w-md bg-[#151515] rounded-2xl border border-gray-800 p-8 space-y-6">
    <div className="text-center"><span className="inline-block px-3 py-1 mb-4 bg-emerald-700 rounded-lg font-bold">LFG</span><h1 className="text-3xl font-bold">{title}</h1><p className="text-gray-400 mt-2">Meet teammates. Play together.</p></div>
    {(mode === 'login' || mode === 'register') && <GoogleSignInButton onCredential={onGoogle} disabled={busy} />}
    {error && <p role="alert" className="text-red-300 bg-red-500/10 p-3 rounded-lg">{error}</p>}
    {message && <p role="status" className="text-emerald-300 bg-emerald-500/10 p-3 rounded-lg">{message}</p>}
    {!message && <form onSubmit={submit} className="space-y-4">
      {['login', 'register', 'forgot'].includes(mode) && <label className="block space-y-2"><span>Email</span><input className={input} type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required maxLength={254} /></label>}
      {mode === 'register' && <label className="block space-y-2"><span>Public username</span><input className={input} autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} minLength={3} maxLength={20} pattern="[A-Za-z0-9_]+" required /></label>}
      {['login', 'register', 'reset'].includes(mode) && <label className="block space-y-2"><span>Password</span><input className={input} type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} minLength={mode === 'login' ? 1 : 10} required /></label>}
      {mode === 'verify' && <p className="text-gray-300">Confirm your email to unlock hosting and joining lobbies.</p>}
      <button disabled={busy || (['reset', 'verify'].includes(mode) && !token)} className="w-full bg-emerald-700 hover:bg-emerald-600 rounded-lg px-4 py-3 font-bold disabled:opacity-50">{busy ? 'Please wait…' : { login: 'Log in', register: 'Create account', forgot: 'Send reset link', reset: 'Update password', verify: 'Verify email' }[mode]}</button>
    </form>}
    <div className="text-center text-sm text-gray-400 space-y-2">{mode === 'login' && <p><Link className="text-emerald-400" to="/forgot-password">Forgot your password?</Link></p>}<p><Link className="text-emerald-400" to={`${mode === 'login' ? '/register' : '/login'}?returnTo=${encodeURIComponent(returnTo)}`}>{mode === 'login' ? 'Create an account' : 'Back to login'}</Link></p></div>
  </div></main>;
}
