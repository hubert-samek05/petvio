import { Capacitor } from '@capacitor/core';
import { notificationsApi } from './api';

// Minimalne typy pluginu — używamy Capacitor.Plugins zamiast importu JS paczki
// (paczka @capacitor-firebase/messaging żyje tylko w natywnej appce; jej webowa
// implementacja wymagałaby całego Firebase JS SDK, którego nie potrzebujemy).
type MessagingPlugin = {
  requestPermissions(): Promise<{ receive: string }>;
  getToken(): Promise<{ token: string }>;
  addListener(event: string, cb: (e: Record<string, unknown>) => void): void;
};

const getMessaging = (): MessagingPlugin | null => {
  const plugins = (Capacitor as unknown as { Plugins?: Record<string, MessagingPlugin> }).Plugins;
  return plugins?.FirebaseMessaging ?? null;
};

// Inicjalizacja push (tylko natywna appka Capacitor; w przeglądarce no-op).
// Wywoływana raz z dashboard layout po sprawdzeniu tokenu JWT.
let initialized = false;
let listenersReady = false;

export const initPush = async (navigate: (path: string) => void): Promise<void> => {
  if (initialized || !Capacitor.isNativePlatform()) return;
  const FirebaseMessaging = getMessaging();
  if (!FirebaseMessaging) return;
  initialized = true;
  try {
    const perm = await FirebaseMessaging.requestPermissions();
    if (perm.receive !== 'granted') return;

    // Token + rotacja tokenu
    const { token } = await FirebaseMessaging.getToken();
    if (token) {
      await notificationsApi.registerDevice(token, Capacitor.getPlatform());
    }
    FirebaseMessaging.addListener('tokenReceived', async (e) => {
      try {
        const t = e.token as string | undefined;
        if (t) await notificationsApi.registerDevice(t, Capacitor.getPlatform());
      } catch {}
    });

    if (!listenersReady) {
      listenersReady = true;

      // Push przy otwartej appce — odśwież dzwonek
      FirebaseMessaging.addListener('notificationReceived', () => {
        try { window.dispatchEvent(new CustomEvent('pv:notification')); } catch {}
      });

      // Klik w push (tło/zamknięta appka) — deep link w data.link
      FirebaseMessaging.addListener('notificationActionPerformed', (e) => {
        const notification = e?.notification as { data?: { link?: string } } | undefined;
        const link = notification?.data?.link;
        if (link && link.startsWith('/')) navigate(link);
      });
    }
  } catch (e) {
    console.warn('Push init failed:', e);
  }
};

// Wywołaj przy wylogowaniu — odpiąć token urządzenia od konta
export const unregisterPush = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;
  const FirebaseMessaging = getMessaging();
  if (!FirebaseMessaging) return;
  try {
    const { token } = await FirebaseMessaging.getToken();
    if (token) await notificationsApi.removeDevice(token);
  } catch {}
};
