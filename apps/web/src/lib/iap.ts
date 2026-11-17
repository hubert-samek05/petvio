import { Capacitor, registerPlugin } from '@capacitor/core';

// Minimalne typy pluginu RevenueCat — proxy natywnego pluginu rejestrujemy sami
// (paczka @revenuecat/purchases-capacitor żyje tylko w natywnej appce iOS).
export type RcPackage = {
  identifier: string;
  packageType: string;
  product: {
    identifier: string;
    title: string;
    description: string;
    priceString: string;
    price: number;
    currencyCode: string;
    subscriptionPeriod?: { unit: string; numberOfUnits: number } | null;
  };
};

export type RcOfferings = {
  current?: { availablePackages: RcPackage[] } | null;
  all?: Record<string, { availablePackages: RcPackage[] }>;
};

export type RcCustomerInfo = {
  entitlements: { active: Record<string, { productIdentifier: string; expirationDate?: string | null }> };
  originalAppUserId: string;
};

type PurchasesPlugin = {
  configure(opts: { apiKey: string; appUserID?: string | null }): Promise<void>;
  logIn(opts: { appUserID: string }): Promise<{ customerInfo: RcCustomerInfo }>;
  logOut(): Promise<{ customerInfo: RcCustomerInfo }>;
  getOfferings(): Promise<{ offerings: RcOfferings }>;
  getCustomerInfo(): Promise<{ customerInfo: RcCustomerInfo }>;
  purchasePackage(opts: { aPackage: RcPackage }): Promise<{ customerInfo: RcCustomerInfo }>;
  restorePurchases(): Promise<{ customerInfo: RcCustomerInfo }>;
  addCustomerInfoUpdateListener(cb: (info: { customerInfo: RcCustomerInfo }) => void): void;
};

let purchasesProxy: PurchasesPlugin | null = null;
const getPurchases = (): PurchasesPlugin | null => {
  if (Capacitor.getPlatform() !== 'ios') return null;
  if (!Capacitor.isPluginAvailable('Purchases')) return null;
  if (!purchasesProxy) purchasesProxy = registerPlugin<PurchasesPlugin>('Purchases');
  return purchasesProxy;
};

const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY || '';

export const iapAvailable = (): boolean => !!getPurchases() && !!apiKey;

let configured = false;
let loggedInUser: string | null = null;

// Inicjalizacja IAP po zalogowaniu — configure z appUserID = id użytkownika Petvio,
// dzięki temu webhook RevenueCat (app_user_id) mapuje się wprost na users.id.
export const initIAP = async (userId: number): Promise<void> => {
  const Purchases = getPurchases();
  if (!Purchases || !apiKey) return;
  const appUserID = `u${userId}`;
  try {
    if (!configured) {
      await Purchases.configure({ apiKey });
      configured = true;
    }
    if (loggedInUser !== appUserID) {
      await Purchases.logIn({ appUserID });
      loggedInUser = appUserID;
    }
  } catch (e) {
    console.warn('IAP init failed:', e);
  }
};

export const logoutIAP = async (): Promise<void> => {
  const Purchases = getPurchases();
  if (!Purchases || !configured) return;
  try {
    await Purchases.logOut();
  } catch {}
  loggedInUser = null;
};

export const getIAPOfferings = async (): Promise<RcPackage[]> => {
  const Purchases = getPurchases();
  if (!Purchases || !configured) return [];
  try {
    const { offerings } = await Purchases.getOfferings();
    return offerings.current?.availablePackages ?? [];
  } catch (e) {
    console.warn('IAP offerings failed:', e);
    return [];
  }
};

// Zwraca true gdy zakup się powiódł; rzuca { cancelled: true } gdy user anulował
export const purchaseIAPPackage = async (pkg: RcPackage): Promise<{ success: boolean; cancelled: boolean }> => {
  const Purchases = getPurchases();
  if (!Purchases) return { success: false, cancelled: false };
  try {
    await Purchases.purchasePackage({ aPackage: pkg });
    return { success: true, cancelled: false };
  } catch (e: unknown) {
    const err = e as { code?: string; userCancelled?: boolean; message?: string };
    if (err.userCancelled || err.code === 'PURCHASE_CANCELLED_ERROR' || /cancelled/i.test(err.message || '')) {
      return { success: false, cancelled: true };
    }
    throw e;
  }
};

export const restoreIAPPurchases = async (): Promise<RcCustomerInfo | null> => {
  const Purchases = getPurchases();
  if (!Purchases || !configured) return null;
  try {
    const { customerInfo } = await Purchases.restorePurchases();
    return customerInfo;
  } catch (e) {
    console.warn('IAP restore failed:', e);
    return null;
  }
};

// Rejestruj listener po init — backendowy webhook i tak jest źródłem prawdy o planie,
// ale to pozwala natychmiast odświeżyć UI po zakupie.
export const onCustomerInfoUpdate = (cb: (info: RcCustomerInfo) => void): void => {
  const Purchases = getPurchases();
  if (!Purchases) return;
  Purchases.addCustomerInfoUpdateListener(({ customerInfo }) => cb(customerInfo));
};
