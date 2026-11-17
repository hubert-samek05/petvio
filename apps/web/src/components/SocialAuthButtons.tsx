'use client';

import { useEffect, useRef, useState } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { authApi } from '@/lib/api';

// Logowanie społecznościowe: Google (web + native) i Apple (iOS + web).
// Google na webie: oficjalny przycisk Google Identity Services; w appce — plugin FirebaseAuthentication.
// Przyciski pokazują się tylko gdy skonfigurowany jest client id — bez niego blok się nie renderuje.

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const APPLE_SERVICE_ID = process.env.NEXT_PUBLIC_APPLE_SERVICE_ID || '';
// Natywne logowanie Google w appce włączamy dopiero, gdy pliki Firebase (google-services.json / plist) mają klientów OAuth.
const NATIVE_GOOGLE = process.env.NEXT_PUBLIC_NATIVE_GOOGLE === 'true';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: { client_id: string; callback: (r: { credential: string }) => void }): void;
          renderButton(el: HTMLElement, opts: Record<string, unknown>): void;
        };
      };
    };
    AppleID?: {
      auth: {
        init(config: {
          clientId: string;
          scope: string;
          redirectURI: string;
          usePopup: boolean;
        }): void;
        signIn(): Promise<{
          authorization: { id_token: string };
          user?: { name?: { firstName?: string; lastName?: string } };
        }>;
      };
    };
  }
}

type FirebaseAuthPlugin = {
  signInWithGoogle(opts?: Record<string, unknown>): Promise<{
    credential?: { idToken?: string };
    user?: { displayName?: string | null };
  }>;
  signInWithApple(opts?: Record<string, unknown>): Promise<{
    credential?: { idToken?: string };
    user?: { displayName?: string | null };
  }>;
};

let authProxy: FirebaseAuthPlugin | null = null;
const getAuthPlugin = (): FirebaseAuthPlugin | null => {
  if (!Capacitor.isPluginAvailable('FirebaseAuthentication')) return null;
  if (!authProxy) authProxy = registerPlugin<FirebaseAuthPlugin>('FirebaseAuthentication');
  return authProxy;
};

const loadScript = (src: string, ready: () => boolean): Promise<void> =>
  new Promise((resolve, reject) => {
    if (ready()) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`load failed: ${src}`));
    document.head.appendChild(s);
  });

const loadGisScript = () => loadScript('https://accounts.google.com/gsi/client', () => Boolean(window.google?.accounts?.id));
const loadAppleScript = () =>
  loadScript('https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js', () => Boolean(window.AppleID?.auth));

const saveSession = (response: { token: string; user: { role?: string } }) => {
  localStorage.setItem('token', response.token);
  localStorage.setItem('user', JSON.stringify(response.user));
};

export default function SocialAuthButtons({
  onSuccess,
  onError,
}: {
  onSuccess: (role?: string) => void;
  onError: (msg: string) => void;
}) {
  const gisBtnRef = useRef<HTMLDivElement>(null);
  const gisWrapRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  // środowisko ustalamy po zamontowaniu (strona jest prerenderowana, natywne API dostępne tylko w przeglądarce)
  const [env, setEnv] = useState<{ isNative: boolean; platform: string; nativeAuth: boolean } | null>(null);
  useEffect(() => {
    const n = Capacitor.isNativePlatform();
    setEnv({
      isNative: n,
      platform: n ? Capacitor.getPlatform() : 'web',
      nativeAuth: n && Capacitor.isPluginAvailable('FirebaseAuthentication'),
    });
  }, []);
  const isNative = !!env?.isNative;
  const showApple = env ? (env.isNative ? env.platform === 'ios' && env.nativeAuth : Boolean(APPLE_SERVICE_ID)) : false;
  const showGoogle = env
    ? Boolean(GOOGLE_CLIENT_ID) && (env.isNative ? NATIVE_GOOGLE && env.nativeAuth : true)
    : false;

  const finish = async (provider: 'google' | 'apple', idToken: string, names?: { firstName?: string; lastName?: string }) => {
    setBusy(true);
    try {
      const response = await authApi.oauth(provider, { idToken, ...names });
      saveSession(response);
      onSuccess(response.user?.role);
    } catch (err) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      onError(e.response?.data?.error?.message || 'Logowanie nie powiodło się');
    } finally {
      setBusy(false);
    }
  };

  // web: כפתור Google רשמי של GIS
  useEffect(() => {
    if (!env || isNative || !showGoogle || !gisBtnRef.current) return;
    let cancelled = false;
    loadGisScript()
      .then(() => {
        if (cancelled || !gisBtnRef.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (r) => finish('google', r.credential),
        });
        const w = Math.min(400, gisWrapRef.current?.clientWidth || 320);
        window.google.accounts.id.renderButton(gisBtnRef.current, {
          theme: 'outline',
          size: 'large',
          width: w,
          text: 'continue_with',
          shape: 'pill',
        });
        setReady(true);
      })
      .catch(() => onError('Nie udało się wczytać logowania Google'));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [env]);

  const nativeGoogle = async () => {
    const FirebaseAuthentication = getAuthPlugin();
    if (!FirebaseAuthentication) return onError('Logowanie Google niedostępne w tej wersji');
    try {
      const r = await FirebaseAuthentication.signInWithGoogle();
      const idToken = r.credential?.idToken;
      if (!idToken) throw new Error('no token');
      const [firstName, ...rest] = (r.user?.displayName || '').split(' ');
      await finish('google', idToken, { firstName, lastName: rest.join(' ') });
    } catch {
      onError('Logowanie Google anulowane lub nieudane');
    }
  };

  const nativeApple = async () => {
    const FirebaseAuthentication = getAuthPlugin();
    if (!FirebaseAuthentication) return onError('Logowanie Apple niedostępne w tej wersji');
    try {
      const r = await FirebaseAuthentication.signInWithApple();
      const idToken = r.credential?.idToken;
      if (!idToken) throw new Error('no token');
      const [firstName, ...rest] = (r.user?.displayName || '').split(' ');
      await finish('apple', idToken, { firstName, lastName: rest.join(' ') });
    } catch {
      onError('Logowanie Apple anulowane lub nieudane');
    }
  };

  const webApple = async () => {
    try {
      await loadAppleScript();
      if (!window.AppleID) throw new Error('no sdk');
      window.AppleID.auth.init({
        clientId: APPLE_SERVICE_ID,
        scope: 'name email',
        redirectURI: window.location.origin + '/login',
        usePopup: true,
      });
      const r = await window.AppleID.auth.signIn();
      const name = r.user?.name;
      await finish('apple', r.authorization.id_token, {
        firstName: name?.firstName,
        lastName: name?.lastName,
      });
    } catch {
      onError('Logowanie Apple anulowane lub nieudane');
    }
  };

  if (!showGoogle && !showApple) return null;

  return (
    <div className="space-y-3" >
      {/* separator */}
      <div className="flex items-center gap-3 my-6" >
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400">lub</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {showGoogle &&
        (isNative ? (
          <button
            type="button"
            onClick={nativeGoogle}
            disabled={busy}
            className="w-full flex items-center justify-center gap-3 py-3.5 bg-white border border-gray-200 rounded-full font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 transition"
          >
            <GoogleLogo />
            <span>Kontynuuj z Google</span>
          </button>
        ) : (
          <div ref={gisWrapRef} className="w-full flex justify-center min-h-[44px] overflow-hidden">
            <div ref={gisBtnRef} />
          </div>
        ))}

      {showApple && (
        <button
          type="button"
          onClick={isNative ? nativeApple : webApple}
          disabled={busy}
          className="w-full flex items-center justify-center gap-3 py-3.5 bg-black text-white rounded-full font-medium shadow-sm hover:bg-gray-900 disabled:opacity-50 transition"
        >
          <AppleLogo />
          <span>Kontynuuj z Apple</span>
        </button>
      )}
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

function AppleLogo() {
  return (
    <svg width="16" height="18" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}
