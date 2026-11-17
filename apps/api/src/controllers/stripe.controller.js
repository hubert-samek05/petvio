const { query } = require('../config/database');
const { TRIAL_DAYS, PAID_SOURCES } = require('../config/plans');
const { getEffectivePlan, applyPlan } = require('../utils/subscription');
const { stripe, configured, priceIdFor, planForPrice, webhookSecret, webUrl, STRIPE_PRICES } = require('../utils/stripe');

const err = (res, status, message) => res.status(status).json({ error: { message, status } });

// Znajduje user_id po stripe_customer_id lub metadata.user_id z obiektu Stripe
const resolveUserId = async ({ customerId, metadata }) => {
  const meta = Number(metadata?.user_id);
  if (Number.isInteger(meta) && meta > 0) return meta;
  if (customerId) {
    const r = await query('SELECT id FROM users WHERE stripe_customer_id = $1', [customerId]);
    if (r.rows.length) return r.rows[0].id;
  }
  return null;
};

const getOrCreateCustomer = async (user) => {
  if (user.stripe_customer_id) return user.stripe_customer_id;
  const customer = await stripe().customers.create({
    email: user.email,
    name: [user.first_name, user.last_name].filter(Boolean).join(' ') || undefined,
    metadata: { user_id: String(user.id) },
  });
  await query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [customer.id, user.id]);
  return customer.id;
};

// Anuluje porzucone próby zakupu (incomplete / trialing z oczekującym SetupIntent).
// Zwraca true, gdy klient ma już DZIAŁAJĄCĄ subskrypcję (wtedy nie wolno tworzyć nowej).
const clearStaleSubscriptions = async (customerId) => {
  const existing = await stripe().subscriptions.list({ customer: customerId, status: 'all', limit: 20 });
  for (const s of existing.data) {
    const stale = s.status === 'incomplete' || (s.status === 'trialing' && !!s.pending_setup_intent);
    if (stale) {
      await stripe().subscriptions.cancel(s.id).catch(() => {});
    } else if (['active', 'trialing', 'past_due'].includes(s.status)) {
      return true;
    }
  }
  return false;
};

// POST /api/subscription/checkout { priceKey: family_monthly|family_yearly|xl_monthly|xl_yearly }
const checkout = async (req, res) => {
  try {
    if (!configured()) return err(res, 503, 'Płatności nie są jeszcze skonfigurowane');
    const userId = req.user.userId;
    const priceKey = String(req.body?.priceKey || '');
    const priceId = priceIdFor(priceKey);
    if (!priceId) return err(res, 400, 'Nieprawidłowy plan — wybierz jedną z dostępnych opcji');

    const u = await query('SELECT id, email, first_name, last_name, stripe_customer_id, role FROM users WHERE id = $1', [userId]);
    const user = u.rows[0];
    if (!user) return err(res, 401, 'Konto nie istnieje');

    const eff = await getEffectivePlan(userId);
    if (!eff) return err(res, 401, 'Konto nie istnieje');
    if (eff.isAdmin) return err(res, 400, 'Konto administratora ma już pełny dostęp');
    if (eff.source === 'stripe' && eff.planId !== 'mini') {
      return err(res, 409, 'Masz już aktywną subskrypcję — zmień plan w portalu płatności');
    }

    const customerId = await getOrCreateCustomer(user);
    const trialEligible = !eff.trialUsed && eff.planId === 'mini';

    if (await clearStaleSubscriptions(customerId)) {
      return err(res, 409, 'Masz już aktywną subskrypcję — zarządzaj nią w portalu płatności');
    }

    const session = await stripe().checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      locale: 'pl',
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      metadata: { user_id: String(userId) },
      subscription_data: {
        metadata: { user_id: String(userId) },
        ...(trialEligible ? { trial_period_days: TRIAL_DAYS } : {}),
      },
      success_url: `${webUrl()}/dashboard/subscription?success=1`,
      cancel_url: `${webUrl()}/dashboard/subscription?canceled=1`,
    });
    res.json({ url: session.url });
  } catch (e) {
    console.error('Stripe checkout error:', e);
    err(res, 500, 'Nie udało się rozpocząć płatności');
  }
};

// POST /api/subscription/payment-session { priceKey } — własny formularz karty (Payment Element).
// Trial → SetupIntent (tylko zapis karty), bez triala → PaymentIntent (pierwsza płatność).
const paymentSession = async (req, res) => {
  try {
    if (!configured()) return err(res, 503, 'Płatności nie są jeszcze skonfigurowane');
    const userId = req.user.userId;
    const priceKey = String(req.body?.priceKey || '');
    const priceId = priceIdFor(priceKey);
    if (!priceId) return err(res, 400, 'Nieprawidłowy plan — wybierz jedną z dostępnych opcji');

    const u = await query('SELECT id, email, first_name, last_name, stripe_customer_id, role FROM users WHERE id = $1', [userId]);
    const user = u.rows[0];
    if (!user) return err(res, 401, 'Konto nie istnieje');

    const eff = await getEffectivePlan(userId);
    if (!eff) return err(res, 401, 'Konto nie istnieje');
    if (eff.isAdmin) return err(res, 400, 'Konto administratora ma już pełny dostęp');
    if (eff.source === 'stripe' && eff.planId !== 'mini') {
      return err(res, 409, 'Masz już aktywną subskrypcję — zmień plan w portalu płatności');
    }

    const customerId = await getOrCreateCustomer(user);
    const trialEligible = !eff.trialUsed && eff.planId === 'mini';

    // Anty-duplikat: stare niepotwierdzone próby anulujemy, aktywna subskrypcja = konflikt
    if (await clearStaleSubscriptions(customerId)) {
      return err(res, 409, 'Masz już aktywną subskrypcję — zarządzaj nią w portalu płatności');
    }

    const sub = await stripe().subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
        payment_method_types: ['card'],
      },
      metadata: { user_id: String(userId) },
      ...(trialEligible ? { trial_period_days: TRIAL_DAYS } : {}),
      expand: ['latest_invoice.confirmation_secret', 'pending_setup_intent'],
    });

    // SetupIntent dla triala ma własną listę metod — ograniczamy do samej karty
    if (sub.pending_setup_intent) {
      await stripe().setupIntents.update(sub.pending_setup_intent.id, {
        payment_method_types: ['card'],
      });
    }

    // Nowe API Stripe: płatność faktury → invoice.confirmation_secret; trial → pending_setup_intent
    const paymentSecret = sub.latest_invoice?.confirmation_secret?.client_secret;
    const setupSecret = sub.pending_setup_intent?.client_secret;
    const clientSecret = paymentSecret || setupSecret;
    if (!clientSecret) return err(res, 500, 'Stripe nie zwrócił sesji płatności');

    res.json({
      clientSecret,
      mode: paymentSecret ? 'payment' : 'setup',
      trial: trialEligible,
      billing: {
        name: [user.first_name, user.last_name].filter(Boolean).join(' ') || undefined,
        email: user.email,
      },
    });
  } catch (e) {
    console.error('Stripe payment session error:', e);
    err(res, 500, 'Nie udało się rozpocząć płatności');
  }
};

// POST /api/subscription/confirm { paymentMethodId } — potwierdzenie SERVER-SIDE.
// WebView mobilny potrafi wieszać wieloetapowe confirmSetup po stronie klienta —
// klient tylko tworzy PaymentMethod, a intencję potwierdza serwer.
const confirm = async (req, res) => {
  try {
    if (!configured()) return err(res, 503, 'Płatności nie są jeszcze skonfigurowane');
    const pmId = String(req.body?.paymentMethodId || '');
    if (!/^pm_[A-Za-z0-9]+$/.test(pmId)) return err(res, 400, 'Nieprawidłowa metoda płatności');

    const u = await query('SELECT id, stripe_customer_id FROM users WHERE id = $1', [req.user.userId]);
    const customerId = u.rows[0]?.stripe_customer_id;
    if (!customerId) return err(res, 400, 'Brak płatności do potwierdzenia — rozpocznij zakup ponownie');

    // Znajdź najnowszą subskrypcję klienta oczekującą na potwierdzenie
    const subs = await stripe().subscriptions.list({ customer: customerId, status: 'all', limit: 10 });
    const pending = subs.data
      .filter((s) => s.pending_setup_intent || s.status === 'incomplete')
      .sort((a, b) => b.created - a.created)[0];
    if (!pending) return err(res, 400, 'Brak oczekującej subskrypcji — rozpocznij zakup ponownie');

    // Bezpieczeństwo: metoda płatności musi należeć do tego klienta albo nie być jeszcze przypisana
    const pm = await stripe().paymentMethods.retrieve(pmId);
    if (pm.customer && pm.customer !== customerId) {
      return err(res, 403, 'Ta metoda płatności należy do innego konta');
    }
    await stripe().paymentMethods.attach(pmId, { customer: customerId }).catch(() => {});

    const si = pending.pending_setup_intent
      ? await stripe().setupIntents.retrieve(pending.pending_setup_intent)
      : null;

    if (si) {
      // Trial — potwierdzamy SetupIntent z poziomu serwera
      const confirmed = await stripe().setupIntents.confirm(si.id, { payment_method: pmId });
      if (confirmed.status === 'requires_action') {
        // Karta wymaga 3DS — klient dokończy przez handleNextAction
        return res.json({ requiresAction: true, clientSecret: confirmed.client_secret, mode: 'setup' });
      }
      if (confirmed.status !== 'succeeded') {
        return err(res, 402, `Płatność nie powiodła się (${confirmed.last_setup_error?.message || confirmed.status})`);
      }
    } else {
      // Bez triala — potwierdzamy PaymentIntent faktury
      const invoice = await stripe().invoices.retrieve(pending.latest_invoice, { expand: ['payments'] });
      const piId = invoice.payments?.data?.[0]?.payment?.payment_intent;
      if (!piId) return err(res, 500, 'Nie znaleziono płatności do potwierdzenia');
      const pi = await stripe().paymentIntents.confirm(piId, { payment_method: pmId });
      if (pi.status === 'requires_action') {
        return res.json({ requiresAction: true, clientSecret: pi.client_secret, mode: 'payment' });
      }
      if (pi.status !== 'succeeded' && pi.status !== 'processing') {
        return err(res, 402, `Płatność nie powiodła się (${pi.last_payment_error?.message || pi.status})`);
      }
    }

    // Karta potwierdzona — ustaw jako domyślną dla odnowień
    await stripe().customers.update(customerId, { invoice_settings: { default_payment_method: pmId } }).catch(() => {});
    res.json({ ok: true });
  } catch (e) {
    console.error('Stripe confirm error:', e);
    const decline = e?.code === 'card_declined' || e?.type === 'StripeCardError';
    err(res, decline ? 402 : 500, e?.raw?.message || e?.message || 'Nie udało się potwierdzić płatności');
  }
};

// POST /api/subscription/paylog — diagnostyka błędów płatności po stronie klienta (bez danych karty)
const paylog = async (req, res) => {
  const d = req.body || {};
  console.log('[PAYLOG]', req.user?.userId, JSON.stringify({
    step: d.step, type: d.type, code: d.code, message: String(d.message || '').slice(0, 300),
    ua: req.headers['user-agent']?.slice(0, 120),
  }));
  res.json({ ok: true });
};

// POST /api/subscription/portal — Stripe Customer Portal (anulowanie, zmiana karty/planu)
const portal = async (req, res) => {
  try {
    if (!configured()) return err(res, 503, 'Płatności nie są jeszcze skonfigurowane');
    const userId = req.user.userId;
    const u = await query('SELECT stripe_customer_id FROM users WHERE id = $1', [userId]);
    const customerId = u.rows[0]?.stripe_customer_id;
    if (!customerId) return err(res, 400, 'To konto nie ma jeszcze płatności Stripe');

    const session = await stripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${webUrl()}/dashboard/subscription`,
    });
    res.json({ url: session.url });
  } catch (e) {
    console.error('Stripe portal error:', e);
    err(res, 500, 'Nie udało się otworzyć portalu płatności');
  }
};

// Koniec bieżącego okresu rozliczeniowego — nowe API trzyma go na poziomie itemu, trial ma trial_end
const subAccessEnd = (sub) =>
  sub.current_period_end || sub.items?.data?.[0]?.current_period_end || sub.trial_end || null;

// Aktywna subskrypcja klienta (pierwsza z aktywnych — duplikaty sprzątamy przy tworzeniu)
const findActiveSub = async (customerId) => {
  const subs = await stripe().subscriptions.list({ customer: customerId, status: 'all', limit: 20 });
  return subs.data.find((s) => ['active', 'trialing', 'past_due'].includes(s.status)) || null;
};

// POST /api/subscription/cancel — anulowanie z końcem opłaconego okresu (wymóg: łatwa rezygnacja w appce)
const cancel = async (req, res) => {
  try {
    if (!configured()) return err(res, 503, 'Płatności nie są jeszcze skonfigurowane');
    const userId = req.user.userId;
    const u = await query('SELECT stripe_customer_id, plan_source FROM users WHERE id = $1', [userId]);
    const customerId = u.rows[0]?.stripe_customer_id;
    if (!customerId || u.rows[0]?.plan_source !== 'stripe') {
      return err(res, 400, 'To konto nie ma aktywnej subskrypcji Stripe');
    }
    const sub = await findActiveSub(customerId);
    if (!sub) return err(res, 404, 'Nie znaleziono aktywnej subskrypcji');

    if (!sub.cancel_at_period_end) {
      await stripe().subscriptions.update(sub.id, { cancel_at_period_end: true });
    }
    const until = subAccessEnd(sub);
    await query('UPDATE users SET stripe_cancel_at_period_end = true, updated_at = NOW() WHERE id = $1', [userId]);
    await query(
      `INSERT INTO subscription_events (user_id, event_type, plan, source, note)
       VALUES ($1, 'cancel_scheduled', (SELECT plan FROM users WHERE id = $1), 'stripe', $2)`,
      [userId, `Anulowanie zaplanowane (${sub.id}) — dostęp do ${until ? new Date(until * 1000).toISOString() : 'końca okresu'}`]
    );
    res.json({ ok: true, accessUntil: until ? new Date(until * 1000) : null });
  } catch (e) {
    console.error('Stripe cancel error:', e);
    err(res, 500, 'Nie udało się anulować subskrypcji — spróbuj ponownie');
  }
};

// POST /api/subscription/resume — cofnięcie anulowania przed końcem okresu
const resume = async (req, res) => {
  try {
    if (!configured()) return err(res, 503, 'Płatności nie są jeszcze skonfigurowane');
    const userId = req.user.userId;
    const u = await query('SELECT stripe_customer_id, plan_source FROM users WHERE id = $1', [userId]);
    const customerId = u.rows[0]?.stripe_customer_id;
    if (!customerId || u.rows[0]?.plan_source !== 'stripe') {
      return err(res, 400, 'To konto nie ma aktywnej subskrypcji Stripe');
    }
    const sub = await findActiveSub(customerId);
    if (!sub) return err(res, 404, 'Nie znaleziono aktywnej subskrypcji');
    if (!sub.cancel_at_period_end) return res.json({ ok: true, alreadyActive: true });

    await stripe().subscriptions.update(sub.id, { cancel_at_period_end: false });
    await query('UPDATE users SET stripe_cancel_at_period_end = false, updated_at = NOW() WHERE id = $1', [userId]);
    await query(
      `INSERT INTO subscription_events (user_id, event_type, plan, source, note)
       VALUES ($1, 'resume', (SELECT plan FROM users WHERE id = $1), 'stripe', $2)`,
      [userId, `Wznowiono subskrypcję po anulowaniu (${sub.id})`]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('Stripe resume error:', e);
    err(res, 500, 'Nie udało się wznowić subskrypcji — spróbuj ponownie');
  }
};

// Synchronizuje stan subskrypcji Stripe → plan użytkownika
// external_id: 'purchase' trzyma id subskrypcji (dedup 1 zakupu/subskrypcja),
// pozostałe zdarzenia dostają unikalny id eventu/faktury — indeks external_id jest unikalny
const syncSubscription = async (sub, { eventType = null, amountGrosz = 0, note = null, eventId = null, externalId = null } = {}) => {
  const userId = await resolveUserId({ customerId: sub.customer, metadata: sub.metadata });
  if (!userId) {
    console.warn('Stripe webhook: nie znaleziono użytkownika dla subskrypcji', sub.id);
    return;
  }

  const item = sub.items?.data?.[0];
  const mapping = item ? planForPrice(item.price.id) : null;
  const accessEnd = subAccessEnd(sub);
  const expiresAt = accessEnd ? new Date(accessEnd * 1000) : null;
  const active = ['active', 'trialing'].includes(sub.status);

  if (!active || !mapping) {
    if (!['trialing', 'active'].includes(sub.status) && ['canceled', 'incomplete_expired'].includes(sub.status)) {
      await applyPlan(userId, {
        plan: 'mini', source: 'free', expiresAt: null,
        eventType: 'expired', externalId: externalId || eventId,
        note: `Subskrypcja Stripe zakończona (${sub.status})`,
      });
    }
    return;
  }

  // Dedup: „purchase" tylko raz na subskrypcję (updated/checkout.session/renewal mogą się nakładać)
  let et = eventType || 'purchase';
  if (et === 'purchase') {
    const dup = await query(
      `SELECT 1 FROM subscription_events WHERE external_id = $1 AND event_type = 'purchase' LIMIT 1`,
      [sub.id]
    );
    if (dup.rows.length) et = 'subscription_sync';
  }

  // Wygaszony plan z wcześniejszego źródła (np. wygasły trial/admin) nadpisujemy płatnym
  await applyPlan(userId, {
    plan: mapping.plan,
    source: 'stripe',
    billing: mapping.billing,
    expiresAt,
    eventType: et,
    amountGrosz,
    externalId: et === 'purchase' ? sub.id : externalId || eventId,
    markTrial: sub.status === 'trialing',
    cancelAtPeriodEnd: !!sub.cancel_at_period_end,
    note,
  });
};

// Id subskrypcji na fakturze: starsze API = invoice.subscription, nowsze = parent.subscription_details
const invoiceSubId = (invoice) =>
  invoice.subscription || invoice.parent?.subscription_details?.subscription || null;

// POST /api/subscription/stripe-webhook (raw body — mount przed express.json)
const webhook = async (req, res) => {
  const secret = webhookSecret();
  if (!configured() || !secret) return res.status(503).send('Stripe webhook not configured');

  let event;
  try {
    event = stripe().webhooks.constructEvent(req.body, req.headers['stripe-signature'], secret);
  } catch (e) {
    console.error('Stripe webhook signature error:', e.message);
    return res.status(400).send(`Webhook Error: ${e.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode === 'subscription' && session.subscription) {
          const sub = await stripe().subscriptions.retrieve(session.subscription);
          await syncSubscription(sub, {
            eventType: 'purchase',
            note: 'Zakup przez Stripe Checkout',
          });
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        await syncSubscription(event.data.object, { note: 'Aktualizacja subskrypcji Stripe', eventId: event.id });
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const userId = await resolveUserId({ customerId: sub.customer, metadata: sub.metadata });
        if (userId) {
          const u = await query('SELECT plan_source FROM users WHERE id = $1', [userId]);
          // Zdejmujemy plan tylko gdy klient nie ma ŻADNEJ innej aktywnej subskrypcji —
          // chroni przed sytuacją, w której wygaśnięcie starej/zduplikowanej subskrypcji
          // zdejmuje plan aktywowany nową płatnością.
          const others = await stripe().subscriptions.list({ customer: sub.customer, status: 'all', limit: 20 });
          const hasActive = others.data.some(
            (s) => s.id !== sub.id && ['active', 'trialing', 'past_due'].includes(s.status)
          );
          if (u.rows[0]?.plan_source === 'stripe' && !hasActive) {
            await applyPlan(userId, {
              plan: 'mini', source: 'free', expiresAt: null,
              eventType: 'cancel', externalId: event.id,
              note: 'Subskrypcja Stripe anulowana',
            });
          }
        }
        break;
      }
      case 'invoice.paid': {
        const invoice = event.data.object;
        const subId = invoiceSubId(invoice);
        if (invoice.billing_reason === 'subscription_cycle' && subId) {
          const sub = await stripe().subscriptions.retrieve(subId);
          await syncSubscription(sub, {
            eventType: 'renewal',
            amountGrosz: invoice.amount_paid,
            externalId: invoice.id,
            note: 'Odnowienie subskrypcji Stripe',
          });
        }
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const userId = await resolveUserId({ customerId: invoice.customer, metadata: null });
        if (userId) {
          await query(
            `INSERT INTO subscription_events (user_id, event_type, plan, source, amount_grosz, external_id, note)
             VALUES ($1, 'payment_failed', (SELECT plan FROM users WHERE id = $1), 'stripe', $2, $3, $4)
             ON CONFLICT (external_id) WHERE external_id IS NOT NULL DO NOTHING`,
            [userId, invoice.amount_due || 0, invoice.id, 'Nieudana płatność za odnowienie — Stripe ponowi próbę']
          );
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error('Stripe webhook handler error:', e);
    return res.status(500).send('Webhook handler error');
  }
  res.json({ received: true });
};

module.exports = { checkout, paymentSession, confirm, paylog, portal, cancel, resume, webhook };
