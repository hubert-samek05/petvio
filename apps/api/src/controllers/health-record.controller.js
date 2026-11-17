const { query } = require('../config/database');
const { petFrozen } = require('../utils/subscription');

const RECORD_TYPES = ['vaccination', 'deworming', 'medication', 'visit'];
const REQUIRED_FIELDS = ['petId', 'recordType', 'recordDate', 'title'];
const UPDATABLE_FIELDS = ['recordType', 'recordDate', 'title', 'veterinarian', 'nextDate', 'description', 'documents'];

const FIELD_COLUMNS = {
  petId: 'pet_id',
  recordType: 'record_type',
  recordDate: 'record_date',
  title: 'title',
  veterinarian: 'veterinarian',
  nextDate: 'next_date',
  description: 'description',
  documents: 'documents',
};

const sendError = (res, status, message) => res.status(status).json({ error: { message, status } });

const parseId = (value) => (/^\d+$/.test(String(value)) ? Number(value) : null);

const isEmpty = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

const cleanText = (v, label, max) => {
  if (isEmpty(v)) return { value: null };
  if (typeof v !== 'string') return { error: `Pole ${label} musi być tekstem` };
  const t = v.trim();
  if (t.length > max) return { error: `Pole ${label} może mieć maksymalnie ${max} znaków` };
  return { value: t };
};

const parseDate = (v, label) => {
  if (isEmpty(v)) return { value: null };
  const m = typeof v === 'string' && v.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
  const day = m && `${m[1]}-${m[2]}-${m[3]}`;
  const d = day && new Date(`${day}T00:00:00Z`);
  if (!d || isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== day) {
    return { error: `Nieprawidłowa data w polu ${label} (format RRRR-MM-DD)` };
  }
  if (day < '1990-01-01') return { error: `Data w polu ${label} jest zbyt odległa` };
  const max = new Date(Date.now() + 10 * 365.25 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  if (day > max) return { error: `Data w polu ${label} może być maksymalnie 10 lat do przodu` };
  return { value: day };
};

const FIELD_VALIDATORS = {
  petId: (v) => {
    const id = parseId(v);
    return id ? { value: id } : { error: 'Nieprawidłowy identyfikator zwierzęcia' };
  },
  recordType: (v) =>
    RECORD_TYPES.includes(v) ? { value: v } : { error: 'Nieprawidłowy typ wpisu zdrowia' },
  recordDate: (v) => {
    if (isEmpty(v)) return { error: 'Data wpisu jest wymagana' };
    return parseDate(v, 'data wpisu');
  },
  nextDate: (v) => parseDate(v, 'kolejny termin'),
  title: (v) => {
    if (typeof v !== 'string' || !v.trim()) return { error: 'Nazwa wpisu jest wymagana' };
    if (v.trim().length > 255) return { error: 'Nazwa wpisu może mieć maksymalnie 255 znaków' };
    return { value: v.trim() };
  },
  veterinarian: (v) => cleanText(v, 'weterynarz', 255),
  description: (v) => cleanText(v, 'notatki', 2000),
  documents: (v) => {
    if (v === undefined || v === null) return { value: null };
    if (!Array.isArray(v)) return { error: 'Pole dokumentów musi być listą' };
    if (v.length > 20) return { error: 'Można dołączyć maksymalnie 20 dokumentów' };
    return { value: JSON.stringify(v) };
  },
};

const validateRecord = (body, { partial }) => {
  const fields = partial ? UPDATABLE_FIELDS : Object.keys(FIELD_COLUMNS);
  const values = {};
  for (const key of fields) {
    if (partial) {
      if (!(key in body)) continue;
      const result = FIELD_VALIDATORS[key](body[key]);
      if (result.error) return { error: result.error };
      values[FIELD_COLUMNS[key]] = result.value;
    } else {
      const result = FIELD_VALIDATORS[key](body[key]);
      if (result.error) return { error: result.error };
      values[FIELD_COLUMNS[key]] = result.value;
    }
  }
  if (!partial) {
    for (const key of REQUIRED_FIELDS) {
      if (values[FIELD_COLUMNS[key]] === null || values[FIELD_COLUMNS[key]] === undefined) {
        return { error: 'Wymagane pola: zwierzę, typ wpisu, data i nazwa' };
      }
    }
  }
  return { values };
};

const getAllRecords = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await query(
      `SELECT hr.* FROM health_records hr
       JOIN pets p ON hr.pet_id = p.id
       WHERE p.user_id = $1 AND p.is_frozen = false
       ORDER BY hr.record_date DESC`,
      [userId]
    );

    res.json({
      records: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Get all health records error:', error);
    sendError(res, 500, 'Wystąpił błąd podczas pobierania rekordów zdrowia');
  }
};

const getRecordsByPet = async (req, res) => {
  try {
    const userId = req.user.userId;
    const petId = parseId(req.params.petId);
    if (!petId) return sendError(res, 400, 'Nieprawidłowy identyfikator zwierzęcia');

    const petCheck = await query(
      'SELECT id, is_frozen FROM pets WHERE id = $1 AND user_id = $2',
      [petId, userId]
    );

    if (petCheck.rows.length === 0) {
      return sendError(res, 404, 'Zwierzę nie zostało znalezione');
    }
    if (petCheck.rows[0].is_frozen) return petFrozen(res);

    const result = await query(
      `SELECT * FROM health_records
       WHERE pet_id = $1
       ORDER BY record_date DESC`,
      [petId]
    );

    res.json({
      records: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Get health records error:', error);
    sendError(res, 500, 'Wystąpił błąd podczas pobierania rekordów zdrowia');
  }
};

const createRecord = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { error, values } = validateRecord(req.body || {}, { partial: false });
    if (error) return sendError(res, 400, error);

    const petCheck = await query(
      'SELECT id, is_frozen FROM pets WHERE id = $1 AND user_id = $2',
      [values.pet_id, userId]
    );

    if (petCheck.rows.length === 0) {
      return sendError(res, 404, 'Zwierzę nie zostało znalezione');
    }
    if (petCheck.rows[0].is_frozen) return petFrozen(res);

    const result = await query(
      `INSERT INTO health_records (pet_id, record_type, record_date, title, description, 
                                   veterinarian, next_date, documents, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING *`,
      [values.pet_id, values.record_type, values.record_date, values.title,
       values.description, values.veterinarian, values.next_date,
       values.documents || '[]']
    );

    res.status(201).json({
      message: 'Rekord zdrowia został dodany pomyślnie',
      record: result.rows[0],
    });
  } catch (error) {
    console.error('Create health record error:', error);
    sendError(res, 500, 'Wystąpił błąd podczas dodawania rekordu zdrowia');
  }
};

const getRecordById = async (req, res) => {
  try {
    const userId = req.user.userId;
    const recordId = parseId(req.params.id);
    if (!recordId) return sendError(res, 400, 'Nieprawidłowy identyfikator wpisu');

    const result = await query(
      `SELECT hr.* FROM health_records hr
       JOIN pets p ON hr.pet_id = p.id
       WHERE hr.id = $1 AND p.user_id = $2 AND p.is_frozen = false`,
      [recordId, userId]
    );

    if (result.rows.length === 0) {
      return sendError(res, 404, 'Rekord zdrowia nie został znaleziony');
    }

    res.json({
      record: result.rows[0],
    });
  } catch (error) {
    console.error('Get health record error:', error);
    sendError(res, 500, 'Wystąpił błąd podczas pobierania rekordu zdrowia');
  }
};

const updateRecord = async (req, res) => {
  try {
    const userId = req.user.userId;
    const recordId = parseId(req.params.id);
    if (!recordId) return sendError(res, 400, 'Nieprawidłowy identyfikator wpisu');

    const { error, values } = validateRecord(req.body || {}, { partial: true });
    if (error) return sendError(res, 400, error);

    const columns = Object.keys(values);
    if (columns.length === 0) return sendError(res, 400, 'Brak danych do aktualizacji');

    const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');
    const result = await query(
      `UPDATE health_records hr
       SET ${setClause}, updated_at = NOW()
       FROM pets p
       WHERE hr.pet_id = p.id AND hr.id = $${columns.length + 1} AND p.user_id = $${columns.length + 2} AND p.is_frozen = false
       RETURNING hr.*`,
      [...columns.map((col) => values[col]), recordId, userId]
    );

    if (result.rows.length === 0) {
      return sendError(res, 404, 'Rekord zdrowia nie został znaleziony');
    }

    res.json({
      message: 'Rekord zdrowia został zaktualizowany pomyślnie',
      record: result.rows[0],
    });
  } catch (error) {
    console.error('Update health record error:', error);
    sendError(res, 500, 'Wystąpił błąd podczas aktualizacji rekordu zdrowia');
  }
};

const deleteRecord = async (req, res) => {
  try {
    const userId = req.user.userId;
    const recordId = parseId(req.params.id);
    if (!recordId) return sendError(res, 400, 'Nieprawidłowy identyfikator wpisu');

    const result = await query(
      `DELETE FROM health_records hr
       USING pets p
       WHERE hr.pet_id = p.id AND hr.id = $1 AND p.user_id = $2 AND p.is_frozen = false
       RETURNING hr.id`,
      [recordId, userId]
    );

    if (result.rows.length === 0) {
      return sendError(res, 404, 'Rekord zdrowia nie został znaleziony');
    }

    res.json({
      message: 'Rekord zdrowia został usunięty pomyślnie',
    });
  } catch (error) {
    console.error('Delete health record error:', error);
    sendError(res, 500, 'Wystąpił błąd podczas usuwania rekordu zdrowia');
  }
};

module.exports = {
  getAllRecords,
  getRecordsByPet,
  createRecord,
  getRecordById,
  updateRecord,
  deleteRecord,
};
