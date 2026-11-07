import { Capacitor } from '@capacitor/core';

// Kontekst mobilny: natywna appka Capacitor ALBO wąski ekran (mobile web).
// Na tej podstawie pokazujemy ekran powitalny /welcome.
export const isMobileContext = (): boolean => {
  if (Capacitor.isNativePlatform()) return true;
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
};
