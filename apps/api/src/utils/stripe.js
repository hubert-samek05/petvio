const Stripe = require('stripe');

// Konfiguracja Stripe: klucze i mapowanie price_id → plan/billing.
// Brak konfiguracji = płatności wyłączone (endpointy zwracają 503, UI pokazuje „wkrótce").

const STRIPE_PRICES = {
  family_monthly: process.env.STRIPE_PRICE_FAMILY_MONTHLY || '',
  family_yearly: process.env.STRIPE_PRICE_FAMILY_YEARLY || '',
  xl_monthly: process.env.STRIPE_PRICE_XL_MONTHLY || '',
  xl_yearly: process.env.STRIPE_PRICE_XL_YEARLY || '',
};

const PRICE_TO_PLAN = Object.fromEntries(
  Object.entries(STRIPE_PRICES)
    .filter(([, priceId]) => priceId)
    .map(([key, priceId]) => [priceId, { plan: key.split('_')[0], billing: key.split('_')[1] }])
);

let client = null;
const stripe = () => {
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-10-29.clover' });
  return client;
};

const configured = () => !!process.env.STRIPE_SECRET_KEY && Object.keys(PRICE_TO_PLAN).length === 4;

const priceIdFor = (priceKey) => STRIPE_PRICES[priceKey] || null;

const planForPrice = (priceId) => PRICE_TO_PLAN[priceId] || null;

const webhookSecret = () => process.env.STRIPE_WEBHOOK_SECRET || null;

const webUrl = () => (process.env.WEB_APP_URL || 'https://petvio.pl').replace(/\/+$/, '');

module.exports = { stripe, configured, priceIdFor, planForPrice, webhookSecret, webUrl, STRIPE_PRICES };
