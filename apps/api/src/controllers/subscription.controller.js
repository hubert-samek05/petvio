const { query } = require('../config/database');
const { PLANS, PREMIUM_FEATURES, SELF_SERVE_TRIAL, TRIAL_DAYS, TRIAL_PLANS, PAID_SOURCES } = require('../config/plans');
const { getEffectivePlan, getUsage, applyPlan } = require('../utils/subscription');
const { configured: stripeConfigured } = require('../utils/stripe');

const err = (res, status, message) => res.status(status).json({ error: { message, status } });

const catalog = () =>
  Object.values(PLANS).map((p) => ({
    id: p.id,
    name: p.name,
    tagline: p.tagline,
    maxPets: p.maxPets,
    maxShares: p.maxShares,
    aiPerDay: p.aiPerDay,
    premiumFeatures: p.premiumFeatures,
    priceMonthly: p.priceMonthly,
    priceYearly: p.priceYearly,
  }));

// ───────────── Użytkownik ─────────────

// GET /api/subscription/me — plan, limity, zużycie
const getMe = async (req, res) => {
  try {
    const userId = req.user.userId;
    const eff = await getEffectivePlan(userId);
    if (!eff) return err(res, 401, 'Konto nie istnieje');
    const usage = await getUsage(userId, eff);
    res.json({
      plan: eff.planId,
      planName: eff.plan.name,
      source: eff.source,
      billing: eff.billing,
      expiresAt: eff.expiresAt,
      isTrial: eff.isTrial,
      isAdmin: eff.isAdmin,
      cancelAtPeriodEnd: !!eff.cancelAtPeriodEnd,
      trialUsed: eff.trialUsed,
      trialAvailable: SELF_SERVE_TRIAL && !eff.isAdmin && eff.planId === 'mini' && !eff.trialUsed,
      trialDays: TRIAL_DAYS,
      premiumFeatures: eff.plan.premiumFeatures,
      features: Object.fromEntries(
        Object.entries(PREMIUM_FEATURES).map(([k, f]) => [k, { ...f, unlocked: eff.plan.premiumFeatures }])
      ),
      usage,
      plans: catalog(),
      paymentsAvailable: stripeConfigured(),
      stripeManaged: eff.source === 'stripe',
      appleManaged: eff.source === 'apple',
    });
  } catch (e) {
    console.error('Subscription me error:', e);
    err(res, 500, 'Nie udało się pobrać informacji o planie');
  }
};

// POST /api/subscription/trial { plan } — jednorazowy okres próbny (bez karty)
const startTrial = async (req, res) => {
  try {
    const userId = req.user.userId;
    if (!SELF_SERVE_TRIAL) return err(res, 403, 'Okres próbny będzie dostępny razem z uruchomieniem płatności');
    const plan = req.body?.plan;
    if (!TRIAL_PLANS.includes(plan)) return err(res, 400, 'Wybierz plan: Duża rodzina lub Bardzo duża rodzina');

    const eff = await getEffectivePlan(userId);
    if (!eff) return err(res, 401, 'Konto nie istnieje');
    if (eff.isAdmin) return err(res, 400, 'Konto administratora ma już pełny dostęp');
    if (eff.trialUsed) return err(res, 409, 'Okres próbny został już wykorzystany na tym koncie');
    if (eff.planId !== 'mini') return err(res, 409, 'Masz już aktywny plan — okres próbny jest dostępny tylko w planie Mini rodzina');

    const r = await query(
      `UPDATE users
          SET plan = $1, plan_source = 'trial', plan_billing = NULL,
              plan_expires_at = NOW() + ($2 || ' days')::interval, trial_used_at = NOW(), updated_at = NOW()
        WHERE id = $3 AND trial_used_at IS NULL AND plan = 'mini' AND role <> 'admin'
        RETURNING plan_expires_at`,
      [plan, String(TRIAL_DAYS), userId]
    );
    if (r.rows.length === 0) return err(res, 409, 'Okres próbny został już wykorzystany na tym koncie');

    await query(
      `INSERT INTO subscription_events (user_id, event_type, plan, source, note)
       VALUES ($1, 'trial_started', $2, 'trial', $3)`,
      [userId, plan, `Okres próbny ${TRIAL_DAYS} dni`]
    );
    res.json({ ok: true, plan, expiresAt: r.rows[0].plan_expires_at });
  } catch (e) {
    console.error('Start trial error:', e);
    err(res, 500, 'Nie udało się uruchomić okresu próbnego');
  }
};

// GET /api/subscription/history — historia subskrypcji użytkownika (popup na stronie planu)
// Ukrywamy zdarzenia techniczne (subscription_sync, limits_reconciled) — klient widzi tylko fakty
const HISTORY_TYPES = [
  'purchase', 'renewal', 'trial_started', 'cancel_scheduled', 'cancel', 'resume',
  'expired', 'payment_failed', 'admin_grant', 'admin_revoke', 'refund',
];
const getHistory = async (req, res) => {
  try {
    const r = await query(
      `SELECT event_type, plan, billing, source, amount_grosz, currency, note, created_at
         FROM subscription_events
        WHERE user_id = $1 AND event_type = ANY($2::text[])
        ORDER BY created_at DESC LIMIT 50`,
      [req.user.userId, HISTORY_TYPES]
    );
    res.json({ events: r.rows });
  } catch (e) {
    console.error('Subscription history error:', e);
    err(res, 500, 'Nie udało się pobrać historii subskrypcji');
  }
};

// ───────────── Admin ─────────────

// Wspólny CTE: efektywny plan/źródło (admin = xl, wygasły = mini/free)
const EFF_CTE = `
  eff AS (
    SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.created_at, u.trial_used_at,
           u.plan_billing, u.plan_expires_at,
           CASE WHEN u.role = 'admin' THEN 'xl'
                WHEN u.plan <> 'mini' AND u.plan_expires_at IS NOT NULL AND u.plan_expires_at < NOW() THEN 'mini'
                ELSE u.plan END AS eplan,
           CASE WHEN u.role = 'admin' THEN 'admin'
                WHEN u.plan <> 'mini' AND u.plan_expires_at IS NOT NULL AND u.plan_expires_at < NOW() THEN 'free'
                ELSE u.plan_source END AS esource
      FROM users u
  )`;

// GET /api/admin/subscriptions/stats
const adminStats = async (req, res) => {
  try {
    const [grouped, paidRows, trialSoon, gf, revenue, weekly, recent, trialStats] = await Promise.all([
      query(`WITH ${EFF_CTE} SELECT eplan, esource, COUNT(*)::int AS c FROM eff GROUP BY 1,2`),
      query(`WITH ${EFF_CTE} SELECT eplan, plan_billing, COUNT(*)::int AS c FROM eff
             WHERE esource = ANY($1::text[]) GROUP BY 1,2`, [PAID_SOURCES]),
      query(`WITH ${EFF_CTE} SELECT COUNT(*)::int AS c FROM eff
             WHERE esource = 'trial' AND plan_expires_at < NOW() + INTERVAL '3 days'`),
      query(`WITH ${EFF_CTE} SELECT COUNT(*)::int AS c, MIN(plan_expires_at) AS first_expiry,
                    COUNT(*) FILTER (WHERE plan_expires_at < NOW() + INTERVAL '60 days')::int AS expiring_60
               FROM eff WHERE esource = 'grandfather'`),
      query(`SELECT
               COALESCE(SUM(CASE WHEN event_type IN ('purchase','renewal') THEN amount_grosz
                                 WHEN event_type = 'refund' THEN -amount_grosz ELSE 0 END), 0)::bigint AS total,
               COALESCE(SUM(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN
                                 CASE WHEN event_type IN ('purchase','renewal') THEN amount_grosz
                                      WHEN event_type = 'refund' THEN -amount_grosz ELSE 0 END ELSE 0 END), 0)::bigint AS last30,
               COALESCE(SUM(CASE WHEN date_trunc('month', created_at) = date_trunc('month', NOW()) THEN
                                 CASE WHEN event_type IN ('purchase','renewal') THEN amount_grosz
                                      WHEN event_type = 'refund' THEN -amount_grosz ELSE 0 END ELSE 0 END), 0)::bigint AS this_month,
               COUNT(*) FILTER (WHERE event_type = 'purchase')::int AS purchases,
               COUNT(*) FILTER (WHERE event_type = 'renewal')::int AS renewals,
               COUNT(*) FILTER (WHERE event_type = 'refund')::int AS refunds,
               COUNT(*) FILTER (WHERE event_type = 'cancel')::int AS cancels
             FROM subscription_events`),
      query(`SELECT to_char(date_trunc('week', g.w), 'YYYY-MM-DD') AS week,
                    COALESCE(COUNT(e.id) FILTER (WHERE e.event_type = 'trial_started'), 0)::int AS trials,
                    COALESCE(COUNT(e.id) FILTER (WHERE e.event_type = 'purchase'), 0)::int AS purchases,
                    COALESCE(SUM(CASE WHEN e.event_type IN ('purchase','renewal') THEN e.amount_grosz
                                      WHEN e.event_type = 'refund' THEN -e.amount_grosz ELSE 0 END), 0)::bigint AS revenue
               FROM generate_series(date_trunc('week', NOW()) - INTERVAL '11 weeks', date_trunc('week', NOW()), INTERVAL '1 week') g(w)
               LEFT JOIN subscription_events e ON date_trunc('week', e.created_at) = g.w
              GROUP BY g.w ORDER BY g.w`),
      query(`SELECT e.id, e.event_type, e.plan, e.billing, e.source, e.amount_grosz, e.currency, e.note, e.created_at,
                    u.id AS user_id, u.email, u.first_name, u.last_name
               FROM subscription_events e JOIN users u ON u.id = e.user_id
              WHERE e.event_type <> 'grandfather'
              ORDER BY e.created_at DESC LIMIT 15`),
      query(`WITH ${EFF_CTE}
             SELECT COUNT(*) FILTER (WHERE trial_used_at IS NOT NULL)::int AS trials_used,
                    COUNT(*) FILTER (WHERE trial_used_at IS NOT NULL AND esource = ANY($1::text[]))::int AS converted
               FROM eff`, [PAID_SOURCES]),
    ]);

    const byPlan = { mini: 0, family: 0, xl: 0 };
    const bySource = {};
    let total = 0;
    for (const r of grouped.rows) {
      byPlan[r.eplan] = (byPlan[r.eplan] || 0) + r.c;
      bySource[r.esource] = (bySource[r.esource] || 0) + r.c;
      total += r.c;
    }

    let mrr = 0;
    let paidTotal = 0;
    for (const r of paidRows.rows) {
      const p = PLANS[r.eplan];
      if (!p) continue;
      paidTotal += r.c;
      mrr += r.c * (r.plan_billing === 'yearly' ? Math.round(p.priceYearly / 12) : p.priceMonthly);
    }

    const gfCount = gf.rows[0].c;
    const ts = trialStats.rows[0];

    res.json({
      totalUsers: total,
      byPlan,
      bySource,
      paid: { count: paidTotal, mrrGrosz: mrr, arrGrosz: mrr * 12 },
      trials: {
        active: bySource.trial || 0,
        endingIn3Days: trialSoon.rows[0].c,
        usedTotal: ts.trials_used,
        converted: ts.converted,
        conversionPct: ts.trials_used > 0 ? Math.round((ts.converted / ts.trials_used) * 1000) / 10 : 0,
      },
      grandfather: {
        count: gfCount,
        firstExpiry: gf.rows[0].first_expiry,
        expiring60Days: gf.rows[0].expiring_60,
        potentialMrrGrosz: gfCount * PLANS.family.priceMonthly,
      },
      revenue: {
        totalGrosz: Number(revenue.rows[0].total),
        last30Grosz: Number(revenue.rows[0].last30),
        thisMonthGrosz: Number(revenue.rows[0].this_month),
        purchases: revenue.rows[0].purchases,
        renewals: revenue.rows[0].renewals,
        refunds: revenue.rows[0].refunds,
        cancels: revenue.rows[0].cancels,
      },
      weekly: weekly.rows.map((w) => ({ ...w, revenue: Number(w.revenue) })),
      recent: recent.rows,
      paymentsConfigured: stripeConfigured(),
    });
  } catch (e) {
    console.error('Admin subscription stats error:', e);
    err(res, 500, 'Nie udało się pobrać statystyk subskrypcji');
  }
};

// GET /api/admin/subscriptions?search=&plan=&source=&page=&limit=
const adminList = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const search = String(req.query.search || '').trim().toLowerCase();
    const plan = PLANS[req.query.plan] ? req.query.plan : null;
    const source = /^[a-z]{3,12}$/.test(String(req.query.source || '')) ? req.query.source : null;

    const where = [];
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      where.push(`(LOWER(email) LIKE $${params.length} OR LOWER(first_name || ' ' || last_name) LIKE $${params.length})`);
    }
    if (plan) { params.push(plan); where.push(`eplan = $${params.length}`); }
    if (source) { params.push(source); where.push(`esource = $${params.length}`); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const rows = await query(
      `WITH ${EFF_CTE}
       SELECT id, email, first_name, last_name, role, created_at, eplan AS plan, esource AS source,
              plan_billing AS billing, plan_expires_at AS expires_at, trial_used_at,
              (SELECT COUNT(*)::int FROM pets p WHERE p.user_id = eff.id) AS pets
         FROM eff ${whereSql}
        ORDER BY (esource IN ('apple','google','stripe')) DESC, created_at DESC
        LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
      params
    );
    const count = await query(`WITH ${EFF_CTE} SELECT COUNT(*)::int AS c FROM eff ${whereSql}`, params);
    res.json({ users: rows.rows, total: count.rows[0].c, page, limit });
  } catch (e) {
    console.error('Admin subscription list error:', e);
    err(res, 500, 'Nie udało się pobrać listy subskrypcji');
  }
};

// GET /api/admin/subscriptions/events?type=&page=
const adminEvents = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 25, 1), 100);
    const type = /^[a-z_]{3,30}$/.test(String(req.query.type || '')) ? req.query.type : null;
    const params = [];
    let where = `WHERE e.event_type <> 'grandfather'`;
    if (type) { params.push(type); where = `WHERE e.event_type = $1`; }
    const rows = await query(
      `SELECT e.id, e.event_type, e.plan, e.billing, e.source, e.amount_grosz, e.currency, e.note, e.created_at,
              u.id AS user_id, u.email, u.first_name, u.last_name
         FROM subscription_events e JOIN users u ON u.id = e.user_id
         ${where} ORDER BY e.created_at DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
      params
    );
    const count = await query(`SELECT COUNT(*)::int AS c FROM subscription_events e ${where}`, params);
    res.json({ events: rows.rows, total: count.rows[0].c, page, limit });
  } catch (e) {
    console.error('Admin subscription events error:', e);
    err(res, 500, 'Nie udało się pobrać zdarzeń');
  }
};

// POST /api/admin/subscriptions/:userId/grant { plan, days, note }
const adminGrant = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const { plan, note } = req.body || {};
    const days = Number(req.body?.days);
    if (!Number.isInteger(userId) || userId <= 0) return err(res, 400, 'Nieprawidłowe ID użytkownika');
    if (!['family', 'xl'].includes(plan)) return err(res, 400, 'Wybierz plan: Duża rodzina lub Bardzo duża rodzina');
    if (!Number.isInteger(days) || days < 1 || days > 3650) return err(res, 400, 'Liczba dni musi być z zakresu 1–3650');
    const exists = await query('SELECT id FROM users WHERE id = $1', [userId]);
    if (exists.rows.length === 0) return err(res, 404, 'Użytkownik nie istnieje');

    await applyPlan(userId, {
      plan,
      source: 'admin',
      expiresAt: new Date(Date.now() + days * 86400000),
      eventType: 'admin_grant',
      note: `${String(note || '').trim().slice(0, 300) || 'Nadane ręcznie przez administratora'} (${days} dni)`,
    });
    res.json({ ok: true });
  } catch (e) {
    console.error('Admin grant error:', e);
    err(res, 500, 'Nie udało się nadać planu');
  }
};

// POST /api/admin/subscriptions/:userId/revoke
const adminRevoke = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId) || userId <= 0) return err(res, 400, 'Nieprawidłowe ID użytkownika');
    const exists = await query('SELECT id FROM users WHERE id = $1', [userId]);
    if (exists.rows.length === 0) return err(res, 404, 'Użytkownik nie istnieje');

    await applyPlan(userId, {
      plan: 'mini',
      source: 'free',
      expiresAt: null,
      eventType: 'admin_revoke',
      note: String(req.body?.note || '').trim().slice(0, 300) || 'Plan odebrany przez administratora',
    });
    res.json({ ok: true });
  } catch (e) {
    console.error('Admin revoke error:', e);
    err(res, 500, 'Nie udało się odebrać planu');
  }
};

module.exports = { getMe, startTrial, getHistory, adminStats, adminList, adminEvents, adminGrant, adminRevoke };
