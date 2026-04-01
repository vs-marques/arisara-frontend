import { type ReactNode, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getStoredToken } from '@/config/api';

/**
 * When `VITE_SATURNO_URL` is defined, redirects the browser to the Saturno instance
 * preserving path and query (Direct Access from the Arisara app).
 */
export function SaturnoRedirect({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const base = import.meta.env.VITE_SATURNO_URL?.replace(/\/$/, '');
  const hasArisaraSession = Boolean(getStoredToken());
  const shouldRedirect = Boolean(base) && !hasArisaraSession;

  useEffect(() => {
    if (!shouldRedirect || !base) return;
    const target = `${base}${loc.pathname}${loc.search}`;
    if (window.location.href !== target) {
      window.location.replace(target);
    }
  }, [base, shouldRedirect, loc.pathname, loc.search]);

  if (shouldRedirect) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] text-sm text-zinc-400">
        Opening Saturno…
      </div>
    );
  }

  return <>{children}</>;
}
