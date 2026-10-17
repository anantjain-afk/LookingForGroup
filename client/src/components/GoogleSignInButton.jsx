import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../api/client';
let scriptPromise;
function loadGoogle() {
  if (window.google?.accounts) return Promise.resolve();
  if (!scriptPromise) scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client'; script.async = true;
    script.onload = resolve; script.onerror = () => { scriptPromise = null; script.remove(); reject(new Error('Could not reach Google.')); };
    document.head.appendChild(script);
  });
  return scriptPromise;
}
export default function GoogleSignInButton({ onCredential, disabled = false }) {
  const target = useRef(null);
  const callback = useRef(onCredential);
  const [failed, setFailed] = useState(false);
  const { data: config } = useQuery({ queryKey: ['auth-config'], queryFn: () => apiGet('/api/auth/config'), retry: false });
  useEffect(() => { callback.current = onCredential; }, [onCredential]);
  useEffect(() => {
    if (!config?.googleClientId) return;
    let active = true;
    loadGoogle().then(() => {
      if (!active || !target.current) return;
      window.google.accounts.id.initialize({ client_id: config.googleClientId, callback: result => callback.current(result.credential), auto_select: false });
      window.google.accounts.id.renderButton(target.current, { theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', width: 300 });
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [config?.googleClientId]);
  if (failed || (config && !config.googleClientId)) return <p className="text-xs text-gray-400 text-center">Google sign-in is temporarily unavailable.</p>;
  return <div className={disabled ? 'pointer-events-none opacity-50' : ''} aria-busy={disabled}><div ref={target} className="flex justify-center min-h-10" /></div>;
}
