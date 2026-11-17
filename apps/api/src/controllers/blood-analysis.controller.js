const { query } = require('../config/database');
const { petFrozen } = require('../utils/subscription');

const sendError = (res, status, message) => res.status(status).json({ error: { message, status } });

const parseId = (value) => (/^\d+$/.test(String(value)) ? Number(value) : null);

const toStr = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
const toNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);
const toStrList = (v, maxItems = 20, maxLen = 300) =>
  Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, maxItems).map((x) => x.slice(0, maxLen)) : [];

const STATUSES = ['normal', 'low', 'high'];
const URGENCIES = ['low', 'medium', 'high'];
const CATEGORIES = ['morphology', 'biochemistry', 'electrolytes'];

const sanitizeParameters = (v) => {
  if (!Array.isArray(v) || v.length === 0 || v.length > 50) return null;
  const out = [];
  for (const p of v) {
    const id = toStr(p?.id, 30);
    const value = toNum(p?.value);
    if (!id || value === null || value <= 0) return null;
    out.push({
      id,
      name: toStr(p.name, 40),
      namePl: toStr(p.namePl, 80),
      unit: toStr(p.unit, 20),
      dogMin: toNum(p.dogMin), dogMax: toNum(p.dogMax),
      catMin: toNum(p.catMin), catMax: toNum(p.catMax),
      value,
      category: CATEGORIES.includes(p.category) ? p.category : 'biochemistry',
    });
  }
  return out;
};

const sanitizeResults = (v) => {
  if (!Array.isArray(v) || v.length === 0 || v.length > 50) return null;
  return v.slice(0, 50).map((r) => ({
    parameter: toStr(r?.parameter, 80),
    paramId: toStr(r?.paramId, 30),
    value: toNum(r?.value) ?? 0,
    min: toNum(r?.min) ?? 0,
    max: toNum(r?.max) ?? 0,
    unit: toStr(r?.unit, 20),
    status: STATUSES.includes(r?.status) ? r.status : 'normal',
    deviation: toNum(r?.deviation) ?? 0,
    interpretation: toStr(r?.interpretation, 2000),
    ageNote: typeof r?.ageNote === 'string' ? r.ageNote.slice(0, 500) : null,
    linkedConditions: toStrList(r?.linkedConditions, 10, 100),
    possibleCauses: toStrList(r?.possibleCauses),
    dietaryRecommendations: toStrList(r?.dietaryRecommendations),
    urgency: URGENCIES.includes(r?.urgency) ? r.urgency : 'low',
  }));
};

const getAll = async (req, res) => {
  try {
    const result = await query(
      `SELECT ba.id, ba.pet_id, ba.species, ba.pet_age, ba.parameters, ba.results, ba.created_at,
              p.name AS pet_name, p.species AS pet_species, p.photo_url AS pet_photo
       FROM blood_analyses ba
       LEFT JOIN pets p ON p.id = ba.pet_id
       WHERE ba.user_id = $1 AND (p.id IS NULL OR p.is_frozen = false)
       ORDER BY ba.created_at DESC
       LIMIT 200`,
      [req.user.userId]
    );
    res.json({ analyses: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Get blood analyses error:', error);
    sendError(res, 500, 'Wystąpił błąd podczas pobierania analiz');
  }
};

const create = async (req, res) => {
  try {
    const userId = req.user.userId;
    const petId = parseId(req.body?.petId);
    if (!petId) return sendError(res, 400, 'Nieprawidłowy identyfikator zwierzęcia');

    const species = ['dog', 'cat'].includes(req.body?.species) ? req.body.species : null;
    if (!species) return sendError(res, 400, 'Nieprawidłowy gatunek — dozwolone: dog, cat');

    const petAge = req.body?.age === null || req.body?.age === undefined
      ? null
      : (Number.isInteger(req.body.age) && req.body.age >= 0 && req.body.age <= 100 ? req.body.age : undefined);
    if (petAge === undefined) return sendError(res, 400, 'Nieprawidłowy wiek zwierzęcia');

    const parameters = sanitizeParameters(req.body?.parameters);
    if (!parameters) return sendError(res, 400, 'Nieprawidłowa lista parametrów (wymagana 1–50 pozycji z wartościami)');

    const results = sanitizeResults(req.body?.results);
    if (!results) return sendError(res, 400, 'Nieprawidłowa lista wyników analizy');

    const petCheck = await query('SELECT id, is_frozen FROM pets WHERE id = $1 AND user_id = $2', [petId, userId]);
    if (petCheck.rows.length === 0) return sendError(res, 404, 'Zwierzę nie zostało znalezione');
    if (petCheck.rows[0].is_frozen) return petFrozen(res);

    const count = await query('SELECT COUNT(*)::int AS c FROM blood_analyses WHERE user_id = $1', [userId]);
    if (count.rows[0].c >= 500) return sendError(res, 400, 'Osiągnięto limit 500 zapisanych analiz');

    const result = await query(
      `INSERT INTO blood_analyses (user_id, pet_id, species, pet_age, parameters, results)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, pet_id, species, pet_age, parameters, results, created_at`,
      [userId, petId, species, petAge, JSON.stringify(parameters), JSON.stringify(results)]
    );
    res.status(201).json({ message: 'Analiza została zapisana', analysis: result.rows[0] });
  } catch (error) {
    console.error('Create blood analysis error:', error);
    sendError(res, 500, 'Wystąpił błąd podczas zapisywania analizy');
  }
};

const remove = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return sendError(res, 400, 'Nieprawidłowy identyfikator analizy');

    const result = await query(
      'DELETE FROM blood_analyses WHERE id = $1 AND user_id = $2 AND NOT EXISTS (SELECT 1 FROM pets p WHERE p.id = blood_analyses.pet_id AND p.is_frozen) RETURNING id',
      [id, req.user.userId]
    );
    if (result.rows.length === 0) return sendError(res, 404, 'Analiza nie została znaleziona');
    res.json({ message: 'Analiza została usunięta' });
  } catch (error) {
    console.error('Delete blood analysis error:', error);
    sendError(res, 500, 'Wystąpił błąd podczas usuwania analizy');
  }
};

module.exports = { getAll, create, remove };
