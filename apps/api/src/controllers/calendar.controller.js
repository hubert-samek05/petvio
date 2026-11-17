const { query } = require('../config/database');
const { petFrozen } = require('../utils/subscription');

const EVENT_TYPES = ['vaccination', 'medication', 'deworming', 'visit', 'other'];
const UPDATABLE_FIELDS = ['eventType', 'eventDate', 'title', 'description', 'completed', 'reminderEnabled'];

const FIELD_COLUMNS = {
  eventType: 'event_type',
  eventDate: 'event_date',
  title: 'title',
  description: 'description',
  completed: 'completed',
  reminderEnabled: 'reminder_enabled',
};

const sendError = (res, status, message) => res.status(status).json({ error: { message, status } });

const parseId = (value) => (/^\d+$/.test(String(value)) ? Number(value) : null);

const isEmpty = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

const parseDate = (v, label) => {
  if (isEmpty(v)) return { error: `${label} jest wymagana` };
  const m = typeof v === 'string' && v.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
  const day = m && `${m[1]}-${m[2]}-${m[3]}`;
  const d = day && new Date(`${day}T00:00:00Z`);
  if (!d || isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== day) {
    return { error: `Nieprawidłowa ${label} (format RRRR-MM-DD)` };
  }
  if (day < '1990-01-01') return { error: `${label} jest zbyt odległa` };
  const max = new Date(Date.now() + 10 * 365.25 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  if (day > max) return { error: `${label} może być maksymalnie 10 lat do przodu` };
  return { value: day };
};

const FIELD_VALIDATORS = {
  eventType: (v) =>
    EVENT_TYPES.includes(v) ? { value: v } : { error: 'Nieprawidłowy typ wydarzenia' },
  eventDate: (v) => parseDate(v, 'data wydarzenia'),
  title: (v) => {
    if (typeof v !== 'string' || !v.trim()) return { error: 'Tytuł wydarzenia jest wymagany' };
    if (v.trim().length > 255) return { error: 'Tytuł może mieć maksymalnie 255 znaków' };
    return { value: v.trim() };
  },
  description: (v) => {
    if (isEmpty(v)) return { value: '' };
    if (typeof v !== 'string') return { error: 'Opis musi być tekstem' };
    if (v.length > 2000) return { error: 'Opis może mieć maksymalnie 2000 znaków' };
    return { value: v.trim() };
  },
  completed: (v) => ({ value: !!v }),
  reminderEnabled: (v) => ({ value: v === undefined ? true : !!v }),
};

const validateEvent = (body, { partial }) => {
  const values = {};
  const fields = partial ? UPDATABLE_FIELDS : ['eventType', 'eventDate', 'title', 'description', 'reminderEnabled'];
  for (const key of fields) {
    if (partial && !(key in body)) continue;
    const result = FIELD_VALIDATORS[key](body[key]);
    if (result.error) return { error: result.error };
    values[FIELD_COLUMNS[key]] = result.value;
  }
  if (!partial) {
    for (const col of ['event_type', 'event_date', 'title']) {
      if (values[col] === null || values[col] === undefined) {
        return { error: 'Wymagane pola: typ wydarzenia, data i tytuł' };
      }
    }
  }
  return { values };
};

const getEvents = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await query(
      `SELECT hc.*, p.name as pet_name, p.species as pet_species
       FROM health_calendar hc
       JOIN pets p ON hc.pet_id = p.id
       WHERE p.user_id = $1 AND p.is_frozen = false
       ORDER BY hc.event_date ASC, hc.created_at ASC`,
      [userId]
    );

    res.json({
      events: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Get calendar events error:', error);
    sendError(res, 500, 'Wystąpił błąd podczas pobierania wydarzeń');
  }
};

const createEvent = async (req, res) => {
  try {
    const userId = req.user.userId;
    const petId = parseId(req.body?.petId);
    if (!petId) return sendError(res, 400, 'Nieprawidłowy identyfikator zwierzęcia');

    const { error, values } = validateEvent(req.body || {}, { partial: false });
    if (error) return sendError(res, 400, error);

    const petCheck = await query(
      'SELECT id, is_frozen FROM pets WHERE id = $1 AND user_id = $2',
      [petId, userId]
    );

    if (petCheck.rows.length === 0) {
      return sendError(res, 404, 'Zwierzę nie zostało znalezione');
    }
    if (petCheck.rows[0].is_frozen) return petFrozen(res);

    const result = await query(
      `INSERT INTO health_calendar (pet_id, event_type, event_date, title, description, reminder_enabled, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [petId, values.event_type, values.event_date, values.title, values.description || '', values.reminder_enabled]
    );

    res.status(201).json({
      message: 'Wydarzenie zostało dodane',
      event: result.rows[0],
    });
  } catch (error) {
    console.error('Create calendar event error:', error);
    sendError(res, 500, 'Wystąpił błąd podczas dodawania wydarzenia');
  }
};

const updateEvent = async (req, res) => {
  try {
    const userId = req.user.userId;
    const eventId = parseId(req.params.id);
    if (!eventId) return sendError(res, 400, 'Nieprawidłowy identyfikator wydarzenia');

    const { error, values } = validateEvent(req.body || {}, { partial: true });
    if (error) return sendError(res, 400, error);

    const columns = Object.keys(values);
    if (columns.length === 0) return sendError(res, 400, 'Brak danych do aktualizacji');

    const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');
    const result = await query(
      `UPDATE health_calendar hc
       SET ${setClause}, updated_at = NOW()
       FROM pets p
       WHERE hc.pet_id = p.id AND hc.id = $${columns.length + 1} AND p.user_id = $${columns.length + 2} AND p.is_frozen = false
       RETURNING hc.*`,
      [...columns.map((col) => values[col]), eventId, userId]
    );

    if (result.rows.length === 0) {
      return sendError(res, 404, 'Wydarzenie nie zostało znalezione');
    }

    res.json({
      message: 'Wydarzenie zostało zaktualizowane',
      event: result.rows[0],
    });
  } catch (error) {
    console.error('Update calendar event error:', error);
    sendError(res, 500, 'Wystąpił błąd podczas aktualizacji wydarzenia');
  }
};

const deleteEvent = async (req, res) => {
  try {
    const userId = req.user.userId;
    const eventId = parseId(req.params.id);
    if (!eventId) return sendError(res, 400, 'Nieprawidłowy identyfikator wydarzenia');

    const result = await query(
      `DELETE FROM health_calendar hc
       USING pets p
       WHERE hc.pet_id = p.id AND hc.id = $1 AND p.user_id = $2 AND p.is_frozen = false
       RETURNING hc.id`,
      [eventId, userId]
    );

    if (result.rows.length === 0) {
      return sendError(res, 404, 'Wydarzenie nie zostało znalezione');
    }

    res.json({
      message: 'Wydarzenie zostało usunięte',
    });
  } catch (error) {
    console.error('Delete calendar event error:', error);
    sendError(res, 500, 'Wystąpił błąd podczas usuwania wydarzenia');
  }
};

module.exports = {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
};
