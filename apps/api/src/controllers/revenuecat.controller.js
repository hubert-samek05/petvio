const { query } = require('../config/database');
const { applyPlan } = require('../utils/subscription');

const err = (res, status, message) => res.status(status).json({ error: { message, status } });

// Mapowanie product_id (App Store / RC) → plan + okres rozliczenia.
// Nadpisywalne przez env REVENUECAT_PRODUCT_MAP (JSON: {"prod_id":{"plan":"xl","billing":"monthly"}})
const defaultMap = (productId) => {
  const id = String(productId || '').toLowerCase();
  if (!id) return null;
  const plan = id.includes('xl') ? 'xl' : id.includes('family') ? 'family' : null;
  if (!plan) return null;
  const billing = /year|annual|roczn/.test(id) ? 'yearly' : 'monthly';
  return { plan, billing };
};

const productMap = (productId) => {
  try {
    const custom = process.env.REVENUECAT_PRODUCT_MAP ? JSON.parse(process.env.REVENUECAT_PRODUCT_MAP) : null;
    if (custom && custom[productId]) return custom[productId];
  } catch {}
  return defaultMap(productId);
};

// app_user_id z RC = nasz userId (apka woła Purchases.logIn z id użytkownika)
const userIdFromEvent = (ev) => {
  for (const v of [ev.app_user_id, ev.original_app_user_id, ...(ev.aliases || [])]) {
    const m = /^u?(\d+)$/.exec(String(v || ''));
    if (m) return Number(m[1]);
  }
  return null;
};

// POST /api/subscription/revenuecat-webhook — zdarzenia IAP (zakup, odnowienie, anulowanie, wygaśnięcie)
// Auth: header Authorization ustawiony w panelu RevenueCat (REVENUECAT_WEBHOOK_SECRET)
const webhook = async (req, res) => {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (!secret) return res.status(503).send('RevenueCat webhook not configured');
  if (req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).send('Unauthorized');
  }

  const ev = req.body?.event;
  if (!ev || !ev.type) return res.status(400).send('Bad event');

  const type = ev.type;
  const userId = userIdFromEvent(ev);
  console.log(`[RC] ${type} | user=${userId} | product=${ev.product_id} | store=${ev.store} | env=${ev.environment}`);

  try {
    if (!userId) {
      console.warn('[RC] brak userId w evencie (app_user_id nie ustawiony?)', ev.id);
      return res.json({ ok: true, skipped: 'no_user' });
    }
    const u = await query('SELECT id FROM users WHERE id = $1', [userId]);
    if (!u.rows.length) {
      console.warn('[RC] użytkownik nie istnieje:', userId);
      return res.json({ ok: true, skipped: 'unknown_user' });
    }

    const expiresAt = ev.expiration_at_ms ? new Date(Number(ev.expiration_at_ms)) : null;
    const amountGrosz = Math.round(Number(ev.price || 0) * 100);
    const externalId = ev.id || null;
    const storeNote = `IAP ${ev.store || 'APP_STORE'} (${ev.environment || 'PRODUCTION'})`;

    switch (type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'UNCANCELLATION':
      case 'NON_RENEWING_PURCHASE': {
        const mapping = productMap(ev.product_id);
        if (!mapping) {
          console.warn('[RC] nieznany product_id:', ev.product_id);
          return res.json({ ok: true, skipped: 'unknown_product' });
        }
        await applyPlan(userId, {
          plan: mapping.plan,
          source: 'apple',
          billing: mapping.billing,
          expiresAt,
          eventType: type === 'RENEWAL' ? 'renewal' : 'purchase',
          amountGrosz,
          externalId,
          markTrial: ev.period_type === 'TRIAL',
          cancelAtPeriodEnd: false,
          note: `${type === 'RENEWAL' ? 'Odnowienie' : 'Zakup'} — ${storeNote}, produkt ${ev.product_id}`,
        });
        break;
      }
      case 'PRODUCT_CHANGE': {
        // Zmiana planu w tej samej grupie subskrypcji App Store.
        // UPGRADE (np. Family -> XL): natychmiastowy + zwrot proporcjonalny od Apple.
        // DOWNGRADE/CROSSGRADE: Apple przekłada na koniec okresu — NIE zmieniamy planu teraz,
        // zastosuje się przy RENEWAL z nowym product_id.
        const newMapping = productMap(ev.new_product_id || ev.product_id);
        if (!newMapping) {
          console.warn('[RC] PRODUCT_CHANGE nieznany produkt:', ev.new_product_id, ev.product_id);
          return res.json({ ok: true, skipped: 'unknown_product' });
        }
        const cur = await query('SELECT plan, plan_source FROM users WHERE id = $1', [userId]);
        const order = { mini: 0, family: 1, xl: 2 };
        const isUpgrade = (order[newMapping.plan] || 0) > (order[cur.rows[0]?.plan] || 0);
        const isApple = cur.rows[0]?.plan_source === 'apple';

        if (isApple && !isUpgrade) {
          await query(
            `INSERT INTO subscription_events (user_id, event_type, plan, source, external_id, note)
             VALUES ($1, 'plan_change_scheduled', (SELECT plan FROM users WHERE id = $1), 'apple', $2, $3)
             ON CONFLICT (external_id) WHERE external_id IS NOT NULL DO NOTHING`,
            [userId, externalId, `Zaplanowano zmianę na ${newMapping.plan} (${newMapping.billing}) — wejdzie przy końcu bieżącego okresu`]
          );
          break;
        }
        await applyPlan(userId, {
          plan: newMapping.plan,
          source: 'apple',
          billing: newMapping.billing,
          expiresAt,
          eventType: 'purchase',
          amountGrosz,
          externalId,
          cancelAtPeriodEnd: false,
          note: `Zmiana planu (upgrade) — ${storeNote}, produkt ${ev.new_product_id || ev.product_id}`,
        });
        break;
      }
      case 'CANCELLATION': {
        // Klient anulował auto-renewal — plan zostaje do końca okresu (expiresAt)
        await query(
          `UPDATE users SET stripe_cancel_at_period_end = true, updated_at = NOW()
            WHERE id = $1 AND plan_source = 'apple'`,
          [userId]
        );
        await query(
          `INSERT INTO subscription_events (user_id, event_type, plan, source, external_id, note)
           VALUES ($1, 'cancel_scheduled', (SELECT plan FROM users WHERE id = $1), 'apple', $2, $3)
           ON CONFLICT (external_id) WHERE external_id IS NOT NULL DO NOTHING`,
          [userId, externalId, `Anulowano w App Store — dostęp do ${expiresAt ? expiresAt.toISOString() : 'końca okresu'}`]
        );
        break;
      }
      case 'EXPIRATION': {
        const cur = await query('SELECT plan_source FROM users WHERE id = $1', [userId]);
        if (cur.rows[0]?.plan_source === 'apple') {
          await applyPlan(userId, {
            plan: 'mini', source: 'free', expiresAt: null,
            eventType: 'expired', externalId,
            note: `Subskrypcja Apple wygasła — ${storeNote}`,
          });
        }
        break;
      }
      case 'BILLING_ISSUE': {
        await query(
          `INSERT INTO subscription_events (user_id, event_type, plan, source, external_id, note)
           VALUES ($1, 'payment_failed', (SELECT plan FROM users WHERE id = $1), 'apple', $2, $3)
           ON CONFLICT (external_id) WHERE external_id IS NOT NULL DO NOTHING`,
          [userId, externalId, 'Problem z płatnością w App Store — Apple ponawia próbę']
        );
        break;
      }
      case 'REFUND': {
        const cur = await query('SELECT plan_source FROM users WHERE id = $1', [userId]);
        if (cur.rows[0]?.plan_source === 'apple') {
          await applyPlan(userId, {
            plan: 'mini', source: 'free', expiresAt: null,
            eventType: 'refund', amountGrosz: -amountGrosz, externalId,
            note: `Zwrot środków App Store — ${storeNote}`,
          });
        }
        break;
      }
      case 'SUBSCRIPTION_PAUSED':
      case 'SUBSCRIBER_ALIAS':
      case 'TRANSFER':
      case 'TEST':
      default:
        // Zdarzenia informacyjne — nic nie robimy
        break;
    }
    res.json({ ok: true });
  } catch (e) {
    console.error('[RC] webhook error:', e);
    res.status(500).send('Webhook error');
  }
};

module.exports = { webhook };
