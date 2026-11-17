// Definicja planów Petvio — JEDNO źródło prawdy dla limitów, cen i bramek premium.
// null = bez limitu. Ceny w groszach (PLN).

const PLANS = {
  mini: {
    id: 'mini',
    name: 'Mini rodzina',
    tagline: 'Na start — dla jednego pupila',
    rank: 0,
    maxPets: 1,
    maxShares: 1,
    aiPerDay: 5,
    premiumFeatures: false,
    priceMonthly: 0,
    priceYearly: 0,
  },
  family: {
    id: 'family',
    name: 'Duża rodzina',
    tagline: 'Do 3 zwierząt, pełen dostęp do funkcji',
    rank: 1,
    maxPets: 3,
    maxShares: 2,
    aiPerDay: 30,
    premiumFeatures: true,
    priceMonthly: 1399,
    priceYearly: 11900,
  },
  xl: {
    id: 'xl',
    name: 'Bardzo duża rodzina',
    tagline: 'Bez limitu zwierząt i współdzielenia',
    rank: 2,
    maxPets: null,
    maxShares: null,
    aiPerDay: 100,
    premiumFeatures: true,
    priceMonthly: 2990,
    priceYearly: 24900,
  },
};

// Funkcje dostępne tylko w płatnych planach
const PREMIUM_FEATURES = {
  blood: {
    name: 'Analiza badań krwi',
    description: 'Wgrywaj wyniki badań i otrzymuj czytelną interpretację z odniesieniem do norm dla gatunku.',
  },
  barf: {
    name: 'Baza i plany BARF',
    description: 'Kalkulator proporcji, baza składników i gotowe plany żywienia surowego dopasowane do pupila.',
  },
  breeding: {
    name: 'Rozród i hodowla',
    description: 'Cykle, ciąże, mioty — kompletny dziennik hodowlany z przypomnieniami.',
  },
};

// Okres próbny bez karty jest wyłączony — wróci razem z płatnościami (trial ze sklepu / Stripe, z kartą).
const SELF_SERVE_TRIAL = process.env.SELF_SERVE_TRIAL === 'true';
const TRIAL_DAYS = 7;
const TRIAL_PLANS = ['family', 'xl'];
const PAID_SOURCES = ['apple', 'google', 'stripe'];

const getPlan = (id) => PLANS[id] || PLANS.mini;

module.exports = { PLANS, PREMIUM_FEATURES, SELF_SERVE_TRIAL, TRIAL_DAYS, TRIAL_PLANS, PAID_SOURCES, getPlan };
