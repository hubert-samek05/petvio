const { query } = require('../config/database');
const { PLANS, PREMIUM_FEATURES, getPlan } = require('../config/plans');

// 402 + kod → frontend pokazuje popup „przejdź na wyższy plan”
const upgradeError = (res, code, message, extra = {}) =>
  res.status(402).json({ error: { message, status: 402, code, ...extra } });

// Efektywny plan użytkownika: admin = pełny dostęp, wygasły plan → Mini (leniwe wygaszanie)
const getEffectivePlan = async (userId) => {
  const r = await query(
    `SELECT role, plan, plan_source, plan_billing, plan_expires_at, trial_used_at, stripe_cancel_at_period_end FROM users WHERE id = $1`,
    [userId]
  );
  const u = r.rows[0];
  if (!u) return null;

  if (u.role === 'admin') {
    return {
      planId: 'xl', plan: PLANS.xl, source: 'admin', billing: null, expiresAt: null,
      isTrial: false, trialUsed: !!u.trial_used_at, isAdmin: true,
    };
  }

  const expired = u.plan !== 'mini' && u.plan_expires_at && new Date(u.plan_expires_at) < new Date();
  if (expired) {
    await query(
      `UPDATE users SET plan = 'mini', plan_source = 'free', plan_billing = NULL, plan_expires_at = NULL,
              stripe_cancel_at_period_end = false WHERE id = $1 AND plan = $2`,
      [userId, u.plan]
    );
    await query(
      `INSERT INTO subscription_events (user_id, event_type, plan, source, note) VALUES ($1, 'expired', $2, $3, $4)`,
      [userId, u.plan, u.plan_source, 'Plan wygasł — powrót do Mini rodziny']
    );
    await reconcileLimits(userId);
    return {
      planId: 'mini', plan: PLANS.mini, source: 'free', billing: null, expiresAt: null,
      isTrial: false, trialUsed: !!u.trial_used_at, isAdmin: false, justExpired: u.plan_source,
    };
  }

  return {
    planId: getPlan(u.plan).id,
    plan: getPlan(u.plan),
    source: u.plan_source,
    billing: u.plan_billing,
    expiresAt: u.plan_expires_at,
    isTrial: u.plan_source === 'trial',
    trialUsed: !!u.trial_used_at,
    isAdmin: false,
    cancelAtPeriodEnd: ['stripe', 'apple'].includes(u.plan_source) && !!u.stripe_cancel_at_period_end,
  };
};

const getUsage = async (userId, eff) => {
  const [pets, shares, ai] = await Promise.all([
    query('SELECT COUNT(*)::int AS c FROM pets WHERE user_id = $1', [userId]),
    query(`SELECT COUNT(*)::int AS c FROM pet_shares WHERE owner_id = $1 AND status IN ('pending','accepted')`, [userId]),
    query(
      `SELECT COALESCE((SELECT count FROM ai_usage WHERE user_id = $1 AND day = (NOW() AT TIME ZONE 'Europe/Warsaw')::date), 0)::int AS used,
              (((NOW() AT TIME ZONE 'Europe/Warsaw')::date + 1)::timestamp AT TIME ZONE 'Europe/Warsaw') AS resets_at`,
      [userId]
    ),
  ]);
  return {
    pets: { used: pets.rows[0].c, max: eff.plan.maxPets },
    shares: { used: shares.rows[0].c, max: eff.plan.maxShares },
    ai: { used: ai.rows[0].used, max: eff.plan.aiPerDay, resetsAt: ai.rows[0].resets_at },
  };
};

// Atomowo zużywa 1 zapytanie AI z dziennej puli; false = limit wyczerpany
const consumeAi = async (userId, max) => {
  const r = await query(
    `INSERT INTO ai_usage (user_id, day, count)
     VALUES ($1, (NOW() AT TIME ZONE 'Europe/Warsaw')::date, 1)
     ON CONFLICT (user_id, day) DO UPDATE SET count = ai_usage.count + 1
       WHERE ai_usage.count < $2
     RETURNING count`,
    [userId, max]
  );
  return r.rows.length > 0 ? r.rows[0].count : false;
};

// Zwrot zapytania, gdy wywołanie AI się nie powiodło (nie karzemy użytkownika za błąd po naszej stronie)
const refundAi = async (userId) => {
  await query(
    `UPDATE ai_usage SET count = GREATEST(count - 1, 0)
     WHERE user_id = $1 AND day = (NOW() AT TIME ZONE 'Europe/Warsaw')::date`,
    [userId]
  );
};

// Sprawdza limit AI; zwraca { ok:true, used, max } albo wysyła 402 i zwraca { ok:false }
const takeAiQuota = async (req, res) => {
  const eff = await getEffectivePlan(req.user.userId);
  if (!eff) {
    res.status(401).json({ error: { message: 'Konto nie istnieje', status: 401 } });
    return { ok: false };
  }
  const max = eff.plan.aiPerDay;
  const used = await consumeAi(req.user.userId, max);
  if (used === false) {
    upgradeError(
      res,
      'AI_LIMIT',
      `Wykorzystano dzienny limit pytań do AI (${max}/${max}). Limit odnowi się jutro${
        eff.planId !== 'xl' ? ' — w wyższym planie masz ich więcej.' : '.'
      }`,
      { limit: max, plan: eff.planId, requiredPlan: eff.planId === 'mini' ? 'family' : 'xl' }
    );
    return { ok: false };
  }
  return { ok: true, used, max };
};

// Middleware: funkcja dostępna tylko w płatnych planach
const requireFeature = (feature) => async (req, res, next) => {
  try {
    const eff = await getEffectivePlan(req.user.userId);
    if (!eff) return res.status(401).json({ error: { message: 'Konto nie istnieje', status: 401 } });
    if (eff.plan.premiumFeatures) return next();
    const f = PREMIUM_FEATURES[feature];
    return upgradeError(
      res,
      'PREMIUM_FEATURE',
      `„${f?.name || 'Ta funkcja'}” jest dostępna w planach Duża rodzina i Bardzo duża rodzina.`,
      { feature, requiredPlan: 'family' }
    );
  } catch (e) {
    console.error('requireFeature error:', e);
    res.status(500).json({ error: { message: 'Błąd weryfikacji planu', status: 500 } });
  }
};

// 402 gdy zwierzę jest zamrożone (plan spadł i zwierzę jest ponad limitem)
const petFrozen = (res) =>
  upgradeError(
    res,
    'PET_FROZEN',
    'To zwierzę jest zamrożone — Twój plan nie obejmuje tylu zwierząt. Wróć do planu premium, aby je odblokować.',
    { requiredPlan: 'family' }
  );

// Sprawdza, czy zwierzę należy do użytkownika i nie jest zamrożone.
// Zwraca wiersz pets, wysyła 404/402 i zwraca null, gdy brak dostępu.
const ownedActivePet = async (res, userId, petId) => {
  const r = await query('SELECT id, is_frozen FROM pets WHERE id = $1 AND user_id = $2', [petId, userId]);
  if (r.rows.length === 0) {
    res.status(404).json({ error: { message: 'Nie znaleziono zwierzęcia', status: 404 } });
    return null;
  }
  if (r.rows[0].is_frozen) {
    petFrozen(res);
    return null;
  }
  return r.rows[0];
};

// Po zmianie planu/limity: zamraża nadmiarowe (najnowsze) zwierzęta i współdzielenia,
// odmraża automatycznie, gdy plan wróci lub zwolni się miejsce (np. po usunięciu).
// LIMIT NULL w Postgresie = bez limitu, więc jeden SQL obsługuje wszystkie plany.
const reconcileLimits = async (userId) => {
  const r = await query('SELECT plan, plan_expires_at, role FROM users WHERE id = $1', [userId]);
  const u = r.rows[0];
  if (!u) return { pets: 0, shares: 0 };
  const expired = u.plan !== 'mini' && u.plan_expires_at && new Date(u.plan_expires_at) < new Date();
  const plan = u.role === 'admin' ? PLANS.xl : getPlan(expired ? 'mini' : u.plan);

  const pets = await query(
    `WITH allowed AS (
       SELECT id FROM pets WHERE user_id = $1
       ORDER BY created_at ASC NULLS LAST, id ASC LIMIT $2)
     UPDATE pets p SET is_frozen = (p.id NOT IN (SELECT id FROM allowed))
      WHERE p.user_id = $1 AND p.is_frozen <> (p.id NOT IN (SELECT id FROM allowed))
     RETURNING p.is_frozen`,
    [userId, plan.maxPets]
  );
  const shares = await query(
    `WITH allowed AS (
       SELECT id FROM pet_shares WHERE owner_id = $1 AND status IN ('pending','accepted')
       ORDER BY invited_at ASC NULLS LAST, id ASC LIMIT $2)
     UPDATE pet_shares s SET is_frozen = (s.id NOT IN (SELECT id FROM allowed))
      WHERE s.owner_id = $1 AND s.status IN ('pending','accepted')
        AND s.is_frozen <> (s.id NOT IN (SELECT id FROM allowed))
     RETURNING s.is_frozen`,
    [userId, plan.maxShares]
  );

  const out = {
    petsFrozen: pets.rows.filter((x) => x.is_frozen).length,
    petsUnfrozen: pets.rows.filter((x) => !x.is_frozen).length,
    sharesFrozen: shares.rows.filter((x) => x.is_frozen).length,
    sharesUnfrozen: shares.rows.filter((x) => !x.is_frozen).length,
  };
  const changed = out.petsFrozen + out.petsUnfrozen + out.sharesFrozen + out.sharesUnfrozen;
  if (changed > 0) {
    const parts = [];
    if (out.petsFrozen) parts.push(`zamrożono ${out.petsFrozen} zwierząt`);
    if (out.petsUnfrozen) parts.push(`odmrożono ${out.petsUnfrozen} zwierząt`);
    if (out.sharesFrozen) parts.push(`zamrożono ${out.sharesFrozen} współdzieleń`);
    if (out.sharesUnfrozen) parts.push(`odmrożono ${out.sharesUnfrozen} współdzieleń`);
    await query(
      `INSERT INTO subscription_events (user_id, event_type, plan, source, note)
       VALUES ($1, 'limits_reconciled', $2, 'system', $3)`,
      [userId, plan.id, parts.join(', ')]
    );
  }
  return out;
};

// Zapisuje plan użytkownika + zdarzenie (jedno miejsce dla triala, admina i przyszłych webhooków płatności)
const applyPlan = async (
  userId,
  { plan, source, billing = null, expiresAt = null, eventType, amountGrosz = 0, externalId = null, note = null, markTrial = false, cancelAtPeriodEnd = false }
) => {
  await query(
    `UPDATE users SET plan = $1, plan_source = $2, plan_billing = $3, plan_expires_at = $4,
            stripe_cancel_at_period_end = $7,
            trial_used_at = CASE WHEN $6 THEN NOW() ELSE trial_used_at END, updated_at = NOW()
     WHERE id = $5`,
    [plan, source, billing, expiresAt, userId, markTrial, ['stripe', 'apple'].includes(source) && cancelAtPeriodEnd]
  );
  // external_id ma unikalny indeks częściowy — przy ponownym dostarczeniu webhooka Stripe
  // pomijamy duplikat zamiast wywalać całą operację
  await query(
    `INSERT INTO subscription_events (user_id, event_type, plan, billing, source, amount_grosz, external_id, note)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (external_id) WHERE external_id IS NOT NULL DO NOTHING`,
    [userId, eventType, plan, billing, source, amountGrosz, externalId, note]
  );
  await reconcileLimits(userId);
};

module.exports = {
  upgradeError, getEffectivePlan, getUsage, consumeAi, refundAi, takeAiQuota, requireFeature, applyPlan,
  petFrozen, ownedActivePet, reconcileLimits,
};
