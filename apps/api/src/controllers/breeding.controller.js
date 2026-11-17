const { query } = require('../config/database');
const { petFrozen } = require('../utils/subscription');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isValidDate = (v) => DATE_RE.test(v) && !isNaN(new Date(`${v}T00:00:00`).getTime());
const numId = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};
const str = (v, max) => (v ? String(v).trim().slice(0, max) : null);

const ownsPet = async (petId, userId) => {
  const r = await query('SELECT id, is_frozen FROM pets WHERE id = $1 AND user_id = $2', [petId, userId]);
  if (r.rows.length === 0) return 'missing';
  return r.rows[0].is_frozen ? 'frozen' : 'ok';
};

const ownsRecord = async (table, id, userId) => {
  const r = await query(`SELECT id FROM ${table} WHERE id = $1 AND user_id = $2`, [id, userId]);
  return r.rows.length > 0;
};

// ---- Cykle ----
const getCycles = async (req, res) => {
  try {
    const result = await query(
      `SELECT c.*, p.name AS pet_name FROM breeding_cycles c
       JOIN pets p ON p.id = c.pet_id
       WHERE c.user_id = $1 AND p.is_frozen = false ORDER BY c.start_date DESC`,
      [req.user.userId]
    );
    res.json({ cycles: result.rows });
  } catch (error) {
    console.error('Get cycles error:', error);
    res.status(500).json({ error: { message: 'Nie udało się pobrać cykli', status: 500 } });
  }
};

const addCycle = async (req, res) => {
  try {
    const { petId, startDate, endDate, mated, matingDate, partnerName, notes } = req.body;
    const pid = numId(petId);
    if (!pid || !startDate) {
      return res.status(400).json({ error: { message: 'Zwierzę i data rozpoczęcia są wymagane', status: 400 } });
    }
    if (!isValidDate(startDate)) {
      return res.status(400).json({ error: { message: 'Nieprawidłowa data rozpoczęcia', status: 400 } });
    }
    if (endDate && !isValidDate(endDate)) {
      return res.status(400).json({ error: { message: 'Nieprawidłowa data zakończenia', status: 400 } });
    }
    if (endDate && endDate < startDate) {
      return res.status(400).json({ error: { message: 'Data zakończenia nie może być wcześniejsza niż rozpoczęcia', status: 400 } });
    }
    if (mated && !matingDate) {
      return res.status(400).json({ error: { message: 'Podaj datę krycia', status: 400 } });
    }
    if (matingDate && !isValidDate(matingDate)) {
      return res.status(400).json({ error: { message: 'Nieprawidłowa data krycia', status: 400 } });
    }
    const ownStatus = await ownsPet(pid, req.user.userId);
    if (ownStatus === 'frozen') return petFrozen(res);
    if (ownStatus !== 'ok') {
      return res.status(403).json({ error: { message: 'To zwierzę nie należy do Ciebie', status: 403 } });
    }
    const result = await query(
      `INSERT INTO breeding_cycles (user_id, pet_id, start_date, end_date, mated, mating_date, partner_name, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [req.user.userId, pid, startDate, endDate || null, !!mated, matingDate || null, str(partnerName, 100), str(notes, 2000)]
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (error) {
    console.error('Add cycle error:', error);
    res.status(500).json({ error: { message: 'Nie udało się dodać cyklu', status: 500 } });
  }
};

const deleteCycle = async (req, res) => {
  try {
    const id = numId(req.params.id);
    if (!id) return res.status(400).json({ error: { message: 'Nieprawidłowe ID cyklu', status: 400 } });
    const r = await query('DELETE FROM breeding_cycles WHERE id = $1 AND user_id = $2 RETURNING id', [
      id, req.user.userId,
    ]);
    if (r.rows.length === 0) return res.status(404).json({ error: { message: 'Cykl nie istnieje', status: 404 } });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete cycle error:', error);
    res.status(500).json({ error: { message: 'Nie udało się usunąć cyklu', status: 500 } });
  }
};

// ---- Ciąże ----
const getPregnancies = async (req, res) => {
  try {
    const result = await query(
      `SELECT pr.*, p.name AS pet_name FROM breeding_pregnancies pr
       JOIN pets p ON p.id = pr.pet_id
       WHERE pr.user_id = $1 AND p.is_frozen = false ORDER BY pr.expected_due_date ASC`,
      [req.user.userId]
    );
    res.json({ pregnancies: result.rows });
  } catch (error) {
    console.error('Get pregnancies error:', error);
    res.status(500).json({ error: { message: 'Nie udało się pobrać ciąż', status: 500 } });
  }
};

const addPregnancy = async (req, res) => {
  try {
    const { petId, matingDate, expectedDueDate, confirmed, confirmationDate, notes } = req.body;
    const pid = numId(petId);
    if (!pid || !matingDate || !expectedDueDate) {
      return res.status(400).json({ error: { message: 'Zwierzę, data krycia i termin porodu są wymagane', status: 400 } });
    }
    if (!isValidDate(matingDate) || !isValidDate(expectedDueDate)) {
      return res.status(400).json({ error: { message: 'Nieprawidłowy format daty', status: 400 } });
    }
    if (expectedDueDate <= matingDate) {
      return res.status(400).json({ error: { message: 'Termin porodu musi być po dacie krycia', status: 400 } });
    }
    if (confirmationDate && !isValidDate(confirmationDate)) {
      return res.status(400).json({ error: { message: 'Nieprawidłowa data potwierdzenia', status: 400 } });
    }
    const ownStatus = await ownsPet(pid, req.user.userId);
    if (ownStatus === 'frozen') return petFrozen(res);
    if (ownStatus !== 'ok') {
      return res.status(403).json({ error: { message: 'To zwierzę nie należy do Ciebie', status: 403 } });
    }
    const result = await query(
      `INSERT INTO breeding_pregnancies (user_id, pet_id, mating_date, expected_due_date, confirmed, confirmation_date, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [req.user.userId, pid, matingDate, expectedDueDate, !!confirmed, confirmationDate || null, str(notes, 2000)]
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (error) {
    console.error('Add pregnancy error:', error);
    res.status(500).json({ error: { message: 'Nie udało się dodać ciąży', status: 500 } });
  }
};

const updatePregnancy = async (req, res) => {
  try {
    const id = numId(req.params.id);
    if (!id) return res.status(400).json({ error: { message: 'Nieprawidłowe ID ciąży', status: 400 } });
    const { confirmed, vetVisits, status, notes } = req.body;
    if (notes !== undefined && typeof notes !== 'string') {
      return res.status(400).json({ error: { message: 'Nieprawidłowe notatki', status: 400 } });
    }
    if (!(await ownsRecord('breeding_pregnancies', id, req.user.userId))) {
      return res.status(404).json({ error: { message: 'Ciąża nie istnieje lub nie jest Twoja', status: 404 } });
    }
    if (status && !['ongoing', 'completed', 'failed'].includes(status)) {
      return res.status(400).json({ error: { message: 'Nieprawidłowy status', status: 400 } });
    }
    await query(
      `UPDATE breeding_pregnancies SET
         confirmed = COALESCE($1, confirmed),
         vet_visits = COALESCE($2, vet_visits),
         status = COALESCE($3, status),
         notes = COALESCE($4, notes)
       WHERE id = $5`,
      [
        confirmed === undefined ? null : !!confirmed,
        vetVisits === undefined ? null : Math.max(0, parseInt(vetVisits) || 0),
        status || null,
        notes === undefined ? null : notes.slice(0, 2000),
        id,
      ]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Update pregnancy error:', error);
    res.status(500).json({ error: { message: 'Nie udało się zaktualizować ciąży', status: 500 } });
  }
};

const deletePregnancy = async (req, res) => {
  try {
    const id = numId(req.params.id);
    if (!id) return res.status(400).json({ error: { message: 'Nieprawidłowe ID ciąży', status: 400 } });
    const r = await query('DELETE FROM breeding_pregnancies WHERE id = $1 AND user_id = $2 RETURNING id', [
      id, req.user.userId,
    ]);
    if (r.rows.length === 0) return res.status(404).json({ error: { message: 'Ciąża nie istnieje', status: 404 } });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete pregnancy error:', error);
    res.status(500).json({ error: { message: 'Nie udało się usunąć ciąży', status: 500 } });
  }
};

// ---- Mioty ----
const getLitters = async (req, res) => {
  try {
    const result = await query(
      `SELECT l.*, p.name AS pet_name FROM breeding_litters l
       JOIN pets p ON p.id = l.pet_id
       WHERE l.user_id = $1 AND p.is_frozen = false ORDER BY l.birth_date DESC`,
      [req.user.userId]
    );
    res.json({ litters: result.rows });
  } catch (error) {
    console.error('Get litters error:', error);
    res.status(500).json({ error: { message: 'Nie udało się pobrać miotów', status: 500 } });
  }
};

const addLitter = async (req, res) => {
  try {
    const { petId, birthDate, puppiesCount, aliveCount, partnerName, notes } = req.body;
    const pid = numId(petId);
    const count = parseInt(puppiesCount, 10);
    const alive = aliveCount !== undefined && aliveCount !== '' ? parseInt(aliveCount, 10) : count;
    if (!pid || !birthDate || !Number.isFinite(count) || count < 1) {
      return res.status(400).json({ error: { message: 'Zwierzę, data i liczba szczeniąt są wymagane', status: 400 } });
    }
    if (!isValidDate(birthDate)) {
      return res.status(400).json({ error: { message: 'Nieprawidłowa data urodzenia', status: 400 } });
    }
    if (count > 100) {
      return res.status(400).json({ error: { message: 'Liczba szczeniąt nie może przekraczać 100', status: 400 } });
    }
    if (birthDate > new Date().toISOString().slice(0, 10)) {
      return res.status(400).json({ error: { message: 'Data urodzenia nie może być w przyszłości', status: 400 } });
    }
    if (!Number.isFinite(alive) || alive < 0 || alive > count) {
      return res.status(400).json({ error: { message: 'Liczba żywych szczeniąt jest nieprawidłowa', status: 400 } });
    }
    const ownStatus = await ownsPet(pid, req.user.userId);
    if (ownStatus === 'frozen') return petFrozen(res);
    if (ownStatus !== 'ok') {
      return res.status(403).json({ error: { message: 'To zwierzę nie należy do Ciebie', status: 403 } });
    }
    const result = await query(
      `INSERT INTO breeding_litters (user_id, pet_id, birth_date, puppies_count, alive_count, partner_name, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [req.user.userId, pid, birthDate, count, alive, str(partnerName, 100), str(notes, 2000)]
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (error) {
    console.error('Add litter error:', error);
    res.status(500).json({ error: { message: 'Nie udało się dodać miotu', status: 500 } });
  }
};

const deleteLitter = async (req, res) => {
  try {
    const id = numId(req.params.id);
    if (!id) return res.status(400).json({ error: { message: 'Nieprawidłowe ID miotu', status: 400 } });
    const r = await query('DELETE FROM breeding_litters WHERE id = $1 AND user_id = $2 RETURNING id', [
      id, req.user.userId,
    ]);
    if (r.rows.length === 0) return res.status(404).json({ error: { message: 'Miot nie istnieje', status: 404 } });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete litter error:', error);
    res.status(500).json({ error: { message: 'Nie udało się usunąć miotu', status: 500 } });
  }
};

module.exports = {
  getCycles, addCycle, deleteCycle,
  getPregnancies, addPregnancy, updatePregnancy, deletePregnancy,
  getLitters, addLitter, deleteLitter,
};
