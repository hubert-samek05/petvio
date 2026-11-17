const cron = require('node-cron');
const { query } = require('../config/database');
const { notify } = require('../controllers/notifications.controller');

// Codzienne przypomnienia push: terminy w kalendarzu zdrowia, szczepienia,
// wizyty u weterynarza i leki. Uruchamiane raz dziennie o 8:00 czasu polskiego.

// Antyspam: nie wysyłaj jeśli taka sama notyfikacja poszła w ciągu ostatnich 20h
const alreadySent = async (userId, type, link) => {
  const r = await query(
    `SELECT 1 FROM notifications
      WHERE user_id = $1 AND type = $2 AND link IS NOT DISTINCT FROM $3
        AND created_at > NOW() - INTERVAL '20 hours'
      LIMIT 1`,
    [userId, type, link]
  );
  return r.rows.length > 0;
};

const sendIfNew = async (userId, type, title, body, link) => {
  if (await alreadySent(userId, type, link)) return;
  await notify(userId, type, title, body, link);
};

const sendDailyReminders = async () => {
  let sent = 0;

  // 1) Kalendarz zdrowia — dziś i jutro (gdy reminder_enabled)
  const cal = await query(
    `SELECT hc.id, hc.title, hc.event_type, hc.event_date, p.name AS pet_name, p.user_id
       FROM health_calendar hc
       JOIN pets p ON p.id = hc.pet_id
      WHERE hc.reminder_enabled = true
        AND hc.completed = false
        AND COALESCE(p.is_frozen, false) = false
        AND hc.event_date::date IN (CURRENT_DATE, CURRENT_DATE + INTERVAL '1 day')`
  );
  for (const e of cal.rows) {
    const today = new Date(e.event_date).toDateString() === new Date().toDateString();
    const d = new Date(e.event_date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' });
    await sendIfNew(
      e.user_id, 'health_reminder',
      today ? `Dziś: ${e.title}` : `Jutro: ${e.title}`,
      `${e.pet_name} — termin ${d}`,
      '/dashboard/calendar'
    );
    sent++;
  }

  // 2) Szczepienia — za tydzień, jutro, dziś
  const vac = await query(
    `SELECT v.id, v.vaccine_name, v.next_vaccination_date, p.name AS pet_name, p.user_id
       FROM vaccinations v
       JOIN pets p ON p.id = v.pet_id
      WHERE v.next_vaccination_date IS NOT NULL
        AND COALESCE(p.is_frozen, false) = false
        AND v.next_vaccination_date::date IN (CURRENT_DATE, CURRENT_DATE + INTERVAL '1 day', CURRENT_DATE + INTERVAL '7 days')`
  );
  for (const v of vac.rows) {
    const diff = Math.round((new Date(v.next_vaccination_date) - new Date()) / 86400000);
    const when = diff <= 0 ? 'dziś' : diff === 1 ? 'jutro' : 'za tydzień';
    await sendIfNew(
      v.user_id, 'vaccination_reminder',
      `Szczepienie ${when}: ${v.pet_name}`,
      `${v.vaccine_name} — ${new Date(v.next_vaccination_date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })}`,
      '/dashboard/health'
    );
    sent++;
  }

  // 3) Wizyty u weterynarza — jutro i dziś
  const vis = await query(
    `SELECT vv.id, vv.clinic_name, vv.veterinarian, vv.next_visit_date, p.name AS pet_name, p.user_id
       FROM vet_visits vv
       JOIN pets p ON p.id = vv.pet_id
      WHERE vv.next_visit_date IS NOT NULL
        AND COALESCE(p.is_frozen, false) = false
        AND vv.next_visit_date::date IN (CURRENT_DATE, CURRENT_DATE + INTERVAL '1 day')`
  );
  for (const v of vis.rows) {
    const today = new Date(v.next_visit_date).toDateString() === new Date().toDateString();
    const where = v.clinic_name || v.veterinarian || '';
    await sendIfNew(
      v.user_id, 'vet_reminder',
      today ? `Dziś wizyta u weterynarza: ${v.pet_name}` : `Jutro wizyta u weterynarza: ${v.pet_name}`,
      where ? `${where} — ${new Date(v.next_visit_date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })}` : undefined,
      '/dashboard/health'
    );
    sent++;
  }

  // 4) Leki — codzienne przypomnienie dla aktywnych kuracji
  const meds = await query(
    `SELECT m.id, m.medication_name, m.dosage, p.name AS pet_name, p.user_id
       FROM medications m
       JOIN pets p ON p.id = m.pet_id
      WHERE m.start_date <= CURRENT_DATE
        AND (m.end_date IS NULL OR m.end_date >= CURRENT_DATE)
        AND COALESCE(p.is_frozen, false) = false`
  );
  for (const m of meds.rows) {
    await sendIfNew(
      m.user_id, 'medication_reminder',
      `Lek dla ${m.pet_name}: ${m.medication_name}`,
      m.dosage ? `Dawka: ${m.dosage}` : undefined,
      '/dashboard/health'
    );
    sent++;
  }

  // 5) Urodziny pupili — w dniu urodzin
  const bday = await query(
    `SELECT p.id, p.name, p.user_id
       FROM pets p
      WHERE p.birth_date IS NOT NULL
        AND COALESCE(p.is_frozen, false) = false
        AND EXTRACT(MONTH FROM p.birth_date) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(DAY FROM p.birth_date) = EXTRACT(DAY FROM CURRENT_DATE)`
  );
  for (const p of bday.rows) {
    await sendIfNew(
      p.user_id, 'pet_birthday',
      `🎂 Dziś urodziny ${p.name}!`,
      'Życzymy zdrowia i dużo smakołyków.',
      '/dashboard/pets'
    );
    sent++;
  }

  // 6) Kończący się trial (za 2 dni) i anulowane subskrypcje (za 3 dni)
  const trialEnd = await query(
    `SELECT id FROM users
      WHERE plan_source = 'trial'
        AND plan_expires_at::date = CURRENT_DATE + INTERVAL '2 days'`
  );
  for (const u of trialEnd.rows) {
    await sendIfNew(
      u.id, 'trial_expiring',
      'Okres próbny kończy się za 2 dni',
      'Przedłuż dostęp premium, żeby nie stracić funkcji — zwierzęta ponad limit zostaną zamrożone.',
      '/dashboard/subscription'
    );
    sent++;
  }
  const subEnd = await query(
    `SELECT id FROM users
      WHERE stripe_cancel_at_period_end = true
        AND plan_expires_at::date = CURRENT_DATE + INTERVAL '3 days'`
  );
  for (const u of subEnd.rows) {
    await sendIfNew(
      u.id, 'subscription_expiring',
      'Subskrypcja wygasa za 3 dni',
      'Wznów ją, żeby zachować pełny dostęp — zwierzęta ponad limit zostaną zamrożone.',
      '/dashboard/subscription'
    );
    sent++;
  }

  // 7) Wydarzenia grupowe — uczestnicy (going/interested) dzień wcześniej i w dniu
  const gev = await query(
    `SELECT DISTINCT ger.user_id, e.title AS event_title, e.starts_at, g.name AS group_name, g.id AS group_id
       FROM group_event_responses ger
       JOIN group_events e ON e.id = ger.event_id
       JOIN pet_groups g ON g.id = e.group_id
      WHERE ger.status IN ('going', 'interested')
        AND e.starts_at::date IN (CURRENT_DATE, CURRENT_DATE + INTERVAL '1 day')`
  );
  for (const ev of gev.rows) {
    const today = new Date(ev.starts_at).toDateString() === new Date().toDateString();
    await sendIfNew(
      ev.user_id, 'group_event_reminder',
      today ? `Dziś: „${ev.event_title}"` : `Jutro: „${ev.event_title}"`,
      `Grupa „${ev.group_name}" — ${new Date(ev.starts_at).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}`,
      `/dashboard/groups/${ev.group_id}?tab=wydarzenia`
    );
    sent++;
  }

  // 8) Zgłoszenia zaginięć: ostrzeżenie po 110 dniach, usunięcie po 120
  const expiring = await query(
    `SELECT id, user_id, pet_name FROM lost_pets
      WHERE status = 'lost' AND created_at::date = CURRENT_DATE - INTERVAL '110 days'`
  );
  for (const lp of expiring.rows) {
    await sendIfNew(
      lp.user_id, 'lost_pet_expiring',
      `Zgłoszenie „${lp.pet_name}" wygaśnie za 10 dni`,
      'Starsze zgłoszenia są usuwane automatycznie. Jeśli pupil nadal jest poszukiwany, dodaj nowe zgłoszenie.',
      '/dashboard/lost-pets'
    );
    sent++;
  }
  const purged = await query(
    `DELETE FROM lost_pets WHERE created_at < NOW() - INTERVAL '120 days' RETURNING id`
  );
  if (purged.rowCount) console.log(`[reminders] usunięto ${purged.rowCount} starych zgłoszeń zaginięć`);

  if (sent) console.log(`[reminders] wysłano ${sent} przypomnień`);
};

// Codziennie 08:00 czasu polskiego
const start = () => {
  cron.schedule('0 8 * * *', sendDailyReminders, { timezone: 'Europe/Warsaw' });
  console.log('[reminders] scheduler uruchomiony (codziennie 08:00 Europe/Warsaw)');
};

module.exports = { start, sendDailyReminders };
