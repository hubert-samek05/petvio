const { query } = require('../config/database');

const TZ = 'Europe/Warsaw';
const EVENT_LIMIT = 5;

const getSummary = async (req, res) => {
  try {
    const userId = req.user.userId;

    const [records, events, walks, flags] = await Promise.all([
      query(
        `SELECT hr.id, hr.title, hr.record_type, hr.next_date, p.id AS pet_id, p.name AS pet_name
         FROM health_records hr
         JOIN pets p ON p.id = hr.pet_id
         WHERE p.user_id = $1 AND p.is_frozen = false
           AND hr.next_date IS NOT NULL
           AND hr.next_date >= (NOW() AT TIME ZONE '${TZ}')::date - 7
           AND hr.next_date <= (NOW() AT TIME ZONE '${TZ}')::date + 90
         ORDER BY hr.next_date ASC`,
        [userId]
      ),
      query(
        `SELECT hc.id, hc.title, hc.event_type, hc.event_date, hc.reminder_enabled, p.id AS pet_id, p.name AS pet_name
         FROM health_calendar hc
         JOIN pets p ON p.id = hc.pet_id
         WHERE p.user_id = $1 AND p.is_frozen = false
           AND hc.completed = FALSE
           AND hc.event_date >= (NOW() AT TIME ZONE '${TZ}')::date - 7
           AND hc.event_date <= (NOW() AT TIME ZONE '${TZ}')::date + 90
         ORDER BY hc.event_date ASC`,
        [userId]
      ),
      query(
        `SELECT EXTRACT(ISODOW FROM local_started)::int AS dow,
                COALESCE(SUM(duration_seconds), 0)::int AS seconds
         FROM (
           SELECT (started_at AT TIME ZONE 'UTC') AT TIME ZONE '${TZ}' AS local_started, duration_seconds
           FROM walks
           WHERE user_id = $1
         ) w
         WHERE local_started >= date_trunc('week', NOW() AT TIME ZONE '${TZ}')
           AND local_started < date_trunc('week', NOW() AT TIME ZONE '${TZ}') + INTERVAL '7 days'
         GROUP BY dow`,
        [userId]
      ),
      query(
        `SELECT
           EXISTS (SELECT 1 FROM health_records hr JOIN pets p ON p.id = hr.pet_id WHERE p.user_id = $1 AND p.is_frozen = false) AS has_health_record,
           (
             EXISTS (SELECT 1 FROM health_calendar hc JOIN pets p ON p.id = hc.pet_id WHERE p.user_id = $1 AND p.is_frozen = false)
             OR EXISTS (SELECT 1 FROM health_records hr JOIN pets p ON p.id = hr.pet_id WHERE p.user_id = $1 AND p.is_frozen = false AND hr.next_date IS NOT NULL)
           ) AS has_reminder,
           (NOW() AT TIME ZONE '${TZ}')::date AS today`,
        [userId]
      ),
    ]);

    const today = flags.rows[0].today;
    const monthPrefix = today.slice(0, 7);
    const plus30 = new Date(`${today}T00:00:00Z`);
    plus30.setUTCDate(plus30.getUTCDate() + 30);
    const limit30 = plus30.toISOString().slice(0, 10);

    const items = [
      ...records.rows.map((r) => ({
        id: `hr-${r.id}`,
        title: r.title,
        type: r.record_type,
        date: r.next_date,
        petId: r.pet_id,
        petName: r.pet_name,
        source: 'record',
        reminder: true,
      })),
      ...events.rows.map((e) => ({
        id: `hc-${e.id}`,
        title: e.title,
        type: e.event_type,
        date: e.event_date,
        petId: e.pet_id,
        petName: e.pet_name,
        source: 'calendar',
        reminder: e.reminder_enabled,
      })),
    ].sort((x, y) => x.date.localeCompare(y.date));

    const upcoming = items.filter((i) => i.date >= today);
    const vaccinations = upcoming.filter((i) => i.type === 'vaccination' && i.date.startsWith(monthPrefix));
    const visits = upcoming.filter((i) => i.type === 'visit' && i.date <= limit30);
    const reminders = items.filter((i) => i.reminder && i.date <= limit30);

    const minutesByDay = Array(7).fill(0);
    walks.rows.forEach((w) => {
      minutesByDay[w.dow - 1] = Math.round(w.seconds / 60);
    });

    res.json({
      stats: {
        vaccinationsThisMonth: vaccinations.length,
        nextVaccinationDate: vaccinations[0]?.date || null,
        upcomingVisits: visits.length,
        nextVisitDate: visits[0]?.date || null,
        activeReminders: reminders.length,
        overdueReminders: reminders.filter((i) => i.date < today).length,
      },
      upcomingEvents: upcoming.slice(0, EVENT_LIMIT),
      minutesByDay,
      checklist: {
        hasHealthRecord: flags.rows[0].has_health_record,
        hasReminder: flags.rows[0].has_reminder,
      },
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ error: { message: 'Nie udało się pobrać danych pulpitu', status: 500 } });
  }
};

module.exports = { getSummary };
