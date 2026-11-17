// Regresja subskrypcji: limity, bramki premium, trial, wygasanie, admin.
// Użycie: node scripts/test-subscriptions.js   (API musi działać na PORT z .env)
// Tworzy tymczasowych użytkowników bezpośrednio w bazie (bez wysyłki maili) i sprząta po sobie.
require('dotenv').config();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { query } = require('../src/config/database');

const BASE = `http://localhost:${process.env.PORT || 3100}`;
let pass = 0;
let fail = 0;
const ok = (cond, name, extra = '') => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); } else { fail++; console.log(`  ✗ ${name} ${extra}`); }
};

const call = async (token, method, path, body) => {
  const r = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await r.json(); } catch {}
  return { status: r.status, data };
};

const mkUser = async (tag, role = 'user') => {
  const email = `subtest-${tag}-${Date.now()}@petvio-test.invalid`;
  const hash = await bcrypt.hash('Test12345!', 4);
  const r = await query(
    `INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES ($1,$2,'Test',$3,$4) RETURNING id, email`,
    [email, hash, tag, role]
  );
  const u = r.rows[0];
  return { ...u, token: jwt.sign({ userId: u.id, email: u.email }, process.env.JWT_SECRET, { expiresIn: '1h' }) };
};

(async () => {
  const created = [];
  try {
    const A = await mkUser('free'); created.push(A.id);
    const ADMIN = await mkUser('admin', 'admin'); created.push(ADMIN.id);
    const OTHER = await mkUser('other'); created.push(OTHER.id);

    console.log('\n[1] Plan Mini — stan początkowy');
    let me = await call(A.token, 'GET', '/api/subscription/me');
    ok(me.status === 200 && me.data.plan === 'mini', 'nowe konto = Mini rodzina');
    ok(me.data.trialAvailable === false, 'samoobsługowy okres próbny wyłączony');
    ok(me.data.usage.pets.max === 1 && me.data.usage.shares.max === 1 && me.data.usage.ai.max === 5, 'limity 1 / 1 / 5');
    ok(me.data.plans.length === 3, 'katalog 3 planów');

    console.log('\n[2] Limit zwierząt');
    const pet = { name: 'Burek', species: 'dog', gender: 'male' };
    let r = await call(A.token, 'POST', '/api/pets', pet);
    ok(r.status === 201, 'pierwsze zwierzę dodane', JSON.stringify(r.data));
    r = await call(A.token, 'POST', '/api/pets', { ...pet, name: 'Reksio' });
    ok(r.status === 402 && r.data.error.code === 'PET_LIMIT', 'drugie zwierzę → 402 PET_LIMIT', JSON.stringify(r.data));
    ok(r.data?.error?.requiredPlan === 'family', 'wskazuje plan Duża rodzina');

    console.log('\n[3] Bramki premium (krew, BARF, rozród)');
    for (const [name, path] of [['krew', '/api/blood-analyses'], ['BARF', '/api/barf/ingredients'], ['rozród', '/api/breeding/cycles']]) {
      r = await call(A.token, 'GET', path);
      ok(r.status === 402 && r.data.error.code === 'PREMIUM_FEATURE', `${name} → 402 PREMIUM_FEATURE`, `status ${r.status}`);
    }
    r = await call(A.token, 'GET', '/api/pets');
    ok(r.status === 200, 'zwykłe funkcje nadal działają (lista zwierząt)');

    console.log('\n[4] Limit współdzielenia');
    const petId = (await query('SELECT id FROM pets WHERE user_id = $1 LIMIT 1', [A.id])).rows[0].id;
    await query(
      `INSERT INTO pet_shares (owner_id, invitee_email, role, permissions, status) VALUES ($1, 'zajete@petvio-test.invalid', 'family', '{}', 'pending')`,
      [A.id]
    );
    r = await call(A.token, 'POST', '/api/sharing/invite', { email: 'nowa-osoba@petvio-test.invalid', role: 'family', petIds: [petId], permissions: {} });
    ok(r.status === 402 && r.data.error.code === 'SHARE_LIMIT', 'druga osoba → 402 SHARE_LIMIT', JSON.stringify(r.data));

    console.log('\n[5] Limit AI (5/dzień w Mini)');
    await query(`INSERT INTO ai_usage (user_id, day, count) VALUES ($1, (NOW() AT TIME ZONE 'Europe/Warsaw')::date, 5)`, [A.id]);
    r = await call(A.token, 'POST', '/api/ai-assistant/ask', { message: 'Test limitu' });
    ok(r.status === 402 && r.data.error.code === 'AI_LIMIT', 'szóste pytanie → 402 AI_LIMIT', JSON.stringify(r.data));
    r = await call(A.token, 'POST', '/api/herbal-advisor/ask', { message: 'Test limitu' });
    ok(r.status === 402 && r.data.error.code === 'AI_LIMIT', 'doradca ziołowy dzieli ten sam limit', JSON.stringify(r.data));
    me = await call(A.token, 'GET', '/api/subscription/me');
    ok(me.data.usage.ai.used === 5, 'licznik AI w /me = 5');

    console.log('\n[6] Okres próbny');
    r = await call(A.token, 'POST', '/api/subscription/trial', { plan: 'family' });
    ok(r.status === 403, 'POST /trial odrzucony (trial bez karty wyłączony)', JSON.stringify(r.data));
    // symulacja próby przychodzącej ze sklepu/Stripe (webhook): plan + zdarzenie jak w applyPlan
    await query(`UPDATE users SET plan='family', plan_source='trial', plan_expires_at = NOW() + INTERVAL '7 days', trial_used_at = NOW() WHERE id = $1`, [A.id]);
    await query(`INSERT INTO subscription_events (user_id, event_type, plan, source, note) VALUES ($1,'trial_started','family','trial','test')`, [A.id]);
    me = await call(A.token, 'GET', '/api/subscription/me');
    ok(me.data.plan === 'family' && me.data.isTrial === true && me.data.trialAvailable === false, '/me: plan family, trial');
    const days = (new Date(me.data.expiresAt) - Date.now()) / 86400000;
    ok(days > 6.9 && days <= 7.01, `trial trwa 7 dni (${days.toFixed(2)})`);
    ok(me.data.usage.pets.max === 3 && me.data.usage.shares.max === 2 && me.data.usage.ai.max === 30, 'limity 3 / 2 / 30');
    r = await call(A.token, 'GET', '/api/barf/ingredients');
    ok(r.status === 200, 'BARF odblokowany w trialu', `status ${r.status}`);
    r = await call(A.token, 'GET', '/api/blood-analyses');
    ok(r.status === 200, 'analiza krwi odblokowana w trialu');
    r = await call(A.token, 'GET', '/api/breeding/cycles');
    ok(r.status === 200, 'rozród odblokowany w trialu');
    r = await call(A.token, 'POST', '/api/pets', { ...pet, name: 'Reksio' });
    ok(r.status === 201, 'drugie zwierzę dodane po trialu', JSON.stringify(r.data));
    r = await call(A.token, 'POST', '/api/pets', { ...pet, name: 'Azor' });
    ok(r.status === 201, 'trzecie zwierzę dodane');
    r = await call(A.token, 'POST', '/api/pets', { ...pet, name: 'Max' });
    ok(r.status === 402 && r.data.error.code === 'PET_LIMIT', 'czwarte zwierzę → PET_LIMIT w Dużej rodzinie');
    r = await call(A.token, 'POST', '/api/sharing/invite', { email: 'zajete@petvio-test.invalid', role: 'family', petIds: [petId], permissions: {} });
    ok(r.status !== 402, 'ponowne zaproszenie tej samej osoby nie zwiększa licznika', `status ${r.status}`);

    console.log('\n[7] Wygasanie planu → zamrożenie nadmiarowych zwierząt');
    await query(`UPDATE users SET plan_expires_at = NOW() - INTERVAL '1 minute' WHERE id = $1`, [A.id]);
    me = await call(A.token, 'GET', '/api/subscription/me');
    ok(me.data.plan === 'mini' && me.data.source === 'free', 'po wygaśnięciu powrót do Mini');
    ok(me.data.trialAvailable === false, 'trial nie wraca');
    r = await call(A.token, 'GET', '/api/barf/ingredients');
    ok(r.status === 402, 'BARF znów zablokowany po wygaśnięciu');
    const ev = await query(`SELECT event_type FROM subscription_events WHERE user_id = $1 ORDER BY id`, [A.id]);
    ok(ev.rows.map((e) => e.event_type).join(',') === 'trial_started,expired,limits_reconciled', 'zdarzenia: trial_started, expired, limits_reconciled', ev.rows.map((e) => e.event_type).join(','));
    r = await call(A.token, 'POST', '/api/pets', { ...pet, name: 'Kolejny' });
    ok(r.status === 402, 'nie dodasz zwierzęcia ponad limit Mini (ma już 3 — zostają, ale bez nowych)');

    console.log('\n[7b] Zamrożone zwierzęta — nic nie da się z nimi zrobić');
    r = await call(A.token, 'GET', '/api/pets');
    const frozenPets = r.data.pets.filter((p) => p.is_frozen);
    const activePets = r.data.pets.filter((p) => !p.is_frozen);
    ok(r.data.pets.length === 3 && frozenPets.length === 2 && activePets.length === 1,
      'zwierzęta zostają w bazie: 1 aktywne + 2 zamrożone', JSON.stringify(r.data.pets.map((p) => [p.name, p.is_frozen])));
    ok(activePets[0]?.name === 'Burek', 'najstarsze zwierzę zostaje aktywne');
    const frozenId = frozenPets[0]?.id;
    const activeId = activePets[0]?.id;
    r = await call(A.token, 'POST', '/api/walks', { petId: frozenId, startedAt: '2024-01-01T10:00:00Z', durationSeconds: 60 });
    ok(r.status === 402 && r.data.error.code === 'PET_FROZEN', 'spacer na zamrożonym → 402 PET_FROZEN', JSON.stringify(r.data));
    r = await call(A.token, 'POST', '/api/health-records', { petId: frozenId, recordType: 'visit', recordDate: '2024-01-01', title: 't' });
    ok(r.status === 402 && r.data.error.code === 'PET_FROZEN', 'wpis zdrowia na zamrożonym → 402 PET_FROZEN', `status ${r.status}`);
    r = await call(A.token, 'PUT', `/api/pets/${frozenId}`, { name: 'Zmienione' });
    ok(r.status === 402 && r.data.error.code === 'PET_FROZEN', 'edycja zamrożonego → 402 PET_FROZEN', `status ${r.status}`);
    r = await call(A.token, 'POST', '/api/sharing/invite', { email: 'x@petvio-test.invalid', role: 'family', petIds: [frozenId], permissions: {} });
    ok(r.status === 402 && r.data.error.code === 'PET_FROZEN', 'udostępnienie zamrożonego → 402 PET_FROZEN', `status ${r.status}`);
    r = await call(A.token, 'POST', '/api/feeding-logs', { petId: frozenId, logDate: '2024-01-01', mealType: 'log', foodName: 't' });
    ok(r.status === 402 && r.data.error.code === 'PET_FROZEN', 'karmienie na zamrożonym → 402 PET_FROZEN', `status ${r.status}`);
    r = await call(A.token, 'POST', '/api/health-calendar', { petId: frozenId, eventType: 'other', eventDate: '2024-01-01', title: 't' });
    ok(r.status === 402 && r.data.error.code === 'PET_FROZEN', 'wydarzenie na zamrożonym → 402 PET_FROZEN', `status ${r.status}`);
    r = await call(A.token, 'POST', '/api/walks', { petId: activeId, startedAt: '2024-01-01T10:00:00Z', durationSeconds: 60 });
    ok(r.status === 201 || r.status === 200, 'aktywne zwierzę działa normalnie', `status ${r.status}`);

    // współdzielony dostęp do zamrożonego pupila — też zablokowany
    const shr = await query(
      `INSERT INTO pet_shares (owner_id, invitee_email, invitee_user_id, role, permissions, status)
       VALUES ($1, $2, $3, 'family', '{}', 'accepted') RETURNING id`,
      [A.id, OTHER.email.toLowerCase(), OTHER.id]
    );
    await query('INSERT INTO pet_share_pets (share_id, pet_id) VALUES ($1, $2)', [shr.rows[0].id, frozenId]);
    r = await call(OTHER.token, 'GET', '/api/sharing/shared-pets');
    ok(!r.data.pets.some((p) => p.id === String(frozenId)), 'współdzielący nie widzi zamrożonego pupila');
    r = await call(OTHER.token, 'GET', `/api/sharing/shared-pets/${frozenId}`);
    ok(r.status === 403 || r.status === 404, 'współdzielący nie otworzy zamrożonego pupila', `status ${r.status}`);

    console.log('\n[7c] Powrót płatności → automatyczne odmrożenie');
    r = await call(ADMIN.token, 'POST', `/api/admin/subscriptions/${A.id}/grant`, { plan: 'family', days: 30, note: 'reaktywacja testowa' });
    ok(r.status === 200, 'admin reaktywuje plan family');
    r = await call(A.token, 'GET', '/api/pets');
    ok(r.data.pets.every((p) => !p.is_frozen), 'wszystkie zwierzęta odmrożone po płatności', JSON.stringify(r.data.pets.map((p) => p.is_frozen)));
    r = await call(A.token, 'POST', '/api/walks', { petId: frozenId, startedAt: '2024-01-02T10:00:00Z', durationSeconds: 30 });
    ok(r.status === 201 || r.status === 200, 'dawniej zamrożone zwierzę znów działa', `status ${r.status}`);

    console.log('\n[7d] Usunięcie zwierzęcia odmraża kolejne w kolejce');
    await call(ADMIN.token, 'POST', `/api/admin/subscriptions/${A.id}/revoke`, {});
    me = await call(A.token, 'GET', '/api/subscription/me');
    ok(me.data.plan === 'mini', 'po revoke znów Mini');
    const petsNow = (await call(A.token, 'GET', '/api/pets')).data.pets;
    const activeNow = petsNow.find((p) => !p.is_frozen);
    r = await call(A.token, 'DELETE', `/api/pets/${activeNow.id}`);
    ok(r.status === 200, 'usunięcie aktywnego zwierzęcia dozwolone', `status ${r.status}`);
    const petsAfter = (await call(A.token, 'GET', '/api/pets')).data.pets;
    ok(petsAfter.filter((p) => !p.is_frozen).length === 1, 'po usunięciu kolejne zwierzę od razu się odmraża', JSON.stringify(petsAfter.map((p) => [p.name, p.is_frozen])));

    console.log('\n[8] Panel admina');
    r = await call(A.token, 'GET', '/api/admin/subscriptions/stats');
    ok(r.status === 403, 'zwykły użytkownik nie widzi statystyk');
    r = await call(ADMIN.token, 'GET', '/api/admin/subscriptions/stats');
    ok(r.status === 200 && typeof r.data.totalUsers === 'number', 'admin widzi statystyki', JSON.stringify(r.data).slice(0, 200));
    ok(r.data.grandfather.count >= 1, `konta z rokiem gratis: ${r.data.grandfather.count}`);
    ok(r.data.weekly.length === 12, '12 tygodni w wykresie');
    r = await call(ADMIN.token, 'POST', `/api/admin/subscriptions/${OTHER.id}/grant`, { plan: 'xl', days: 30, note: 'test' });
    ok(r.status === 200, 'admin nadaje plan XL na 30 dni', JSON.stringify(r.data));
    me = await call(OTHER.token, 'GET', '/api/subscription/me');
    ok(me.data.plan === 'xl' && me.data.source === 'admin', 'użytkownik widzi nadany plan XL');
    ok(me.data.usage.pets.max === null && me.data.usage.shares.max === null, 'XL: bez limitu zwierząt i współdzielenia');
    r = await call(ADMIN.token, 'POST', `/api/admin/subscriptions/${OTHER.id}/grant`, { plan: 'mini', days: 30 });
    ok(r.status === 400, 'nie można nadać planu mini przez grant');
    r = await call(ADMIN.token, 'GET', '/api/admin/subscriptions?search=subtest-other');
    ok(r.status === 200 && r.data.users.length === 1 && r.data.users[0].plan === 'xl', 'lista admina filtruje po emailu');
    r = await call(ADMIN.token, 'POST', `/api/admin/subscriptions/${OTHER.id}/revoke`, {});
    ok(r.status === 200, 'admin odbiera plan');
    me = await call(OTHER.token, 'GET', '/api/subscription/me');
    ok(me.data.plan === 'mini', 'po odebraniu: Mini');
    r = await call(ADMIN.token, 'GET', '/api/admin/subscriptions/events');
    ok(r.status === 200 && r.data.events.some((e) => e.event_type === 'admin_grant'), 'zdarzenia zawierają admin_grant');
    me = await call(ADMIN.token, 'GET', '/api/subscription/me');
    ok(me.data.plan === 'xl' && me.data.isAdmin === true && me.data.trialAvailable === false, 'konto admina = pełny dostęp');

    console.log('\n[9] Bezpieczeństwo');
    r = await fetch(`${BASE}/api/subscription/me`);
    ok(r.status === 401, '/me wymaga logowania');
    r = await call(A.token, 'POST', `/api/admin/subscriptions/${A.id}/grant`, { plan: 'xl', days: 3650 });
    ok(r.status === 403, 'zwykły użytkownik nie może sam sobie nadać planu');
  } catch (e) {
    fail++;
    console.error('BŁĄD TESTU:', e);
  } finally {
    if (created.length) await query('DELETE FROM users WHERE id = ANY($1::int[])', [created]);
    console.log(`\nWynik: ${pass} OK, ${fail} błędów`);
    process.exit(fail ? 1 : 0);
  }
})();
