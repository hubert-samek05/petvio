const { query } = require('../config/database');

const VALID_TYPES = ['behaviorist', 'trainer', 'zoopsychologist'];
const VALID_SPECIES = ['dog', 'cat', 'both'];

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const getAll = async (req, res) => {
  try {
    const { type, species, lat, lng, city } = req.query;

    const conditions = [`"isApproved" = true`];
    const params = [];

    if (type) {
      params.push(type);
      conditions.push(`specialty = $${params.length}`);
    }
    if (city) {
      params.push(`%${city}%`);
      conditions.push(`location ILIKE $${params.length}`);
    }

    const result = await query(
      `SELECT id, name, specialty, location, description, phone, email, website, "avatarUrl", "isApproved", "isVerified", "createdAt"
       FROM "Specialist"
       WHERE ${conditions.join(' AND ')}
       ORDER BY "createdAt" DESC`,
      params
    );

    let specialists = result.rows;

    const userLat = lat ? parseFloat(lat) : null;
    const userLng = lng ? parseFloat(lng) : null;

    res.json({ specialists });
  } catch (error) {
    console.error('Get specialists error:', error);
    res.status(500).json({ error: { message: 'Nie udało się pobrać listy specjalistów', status: 500 } });
  }
};

const getMine = async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, specialty, location, description, phone, email, website, "avatarUrl", "isApproved", "isVerified", "createdAt"
       FROM "Specialist" WHERE "userId" = $1 ORDER BY "createdAt" DESC`,
      [req.user.userId]
    );
    res.json({ specialists: result.rows });
  } catch (error) {
    console.error('Get my specialists error:', error);
    res.status(500).json({ error: { message: 'Nie udało się pobrać Twoich zgłoszeń', status: 500 } });
  }
};

const create = async (req, res) => {
  try {
    const {
      name,
      specialistType,
      species,
      description,
      phone,
      email,
      website,
      city,
      address,
      latitude,
      longitude,
      priceInfo,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: { message: 'Nazwa specjalisty jest wymagana', status: 400 } });
    }
    if (!VALID_TYPES.includes(specialistType)) {
      return res.status(400).json({ error: { message: 'Nieprawidłowy typ specjalisty', status: 400 } });
    }
    if (species && !VALID_SPECIES.includes(species)) {
      return res.status(400).json({ error: { message: 'Nieprawidłowa wartość gatunku', status: 400 } });
    }

    const result = await query(
      `INSERT INTO specialists
        (name, specialist_type, species, description, phone, email, website, city, address, latitude, longitude, price_info, status, submitted_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending', $13)
       RETURNING *`,
      [
        name.trim(),
        specialistType,
        species || 'both',
        description || null,
        phone || null,
        email || null,
        website || null,
        city || null,
        address || null,
        latitude != null && latitude !== '' ? latitude : null,
        longitude != null && longitude !== '' ? longitude : null,
        priceInfo || null,
        req.user.userId,
      ]
    );

    res.status(201).json({
      message: 'Zgłoszenie zostało wysłane do weryfikacji przez administratora.',
      specialist: result.rows[0],
    });
  } catch (error) {
    console.error('Create specialist error:', error);
    res.status(500).json({ error: { message: 'Nie udało się zgłosić specjalisty', status: 500 } });
  }
};

const getPending = async (req, res) => {
  try {
    const result = await query(
      `SELECT s.*, u.email AS submitted_by_email, u.name AS submitted_by_name
       FROM "Specialist" s
       LEFT JOIN "User" u ON u.id = s."userId"
       WHERE s."isApproved" = false
       ORDER BY s."createdAt" ASC`
    );
    res.json({ specialists: result.rows });
  } catch (error) {
    console.error('Get pending specialists error:', error);
    res.status(500).json({ error: { message: 'Nie udało się pobrać zgłoszeń do weryfikacji', status: 500 } });
  }
};

const approve = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `UPDATE "Specialist" SET "isApproved" = true, "isVerified" = true, "updatedAt" = NOW()
       WHERE id = $1 RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Nie znaleziono zgłoszenia', status: 404 } });
    }
    res.json({ message: 'Specjalista został zatwierdzony', specialist: result.rows[0] });
  } catch (error) {
    console.error('Approve specialist error:', error);
    res.status(500).json({ error: { message: 'Nie udało się zatwierdzić specjalisty', status: 500 } });
  }
};

const reject = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const result = await query(
      `UPDATE "Specialist" SET "isApproved" = false, description = COALESCE($1, description), "updatedAt" = NOW()
       WHERE id = $2 RETURNING *`,
      [reason || null, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Nie znaleziono zgłoszenia', status: 404 } });
    }
    res.json({ message: 'Zgłoszenie zostało odrzucone', specialist: result.rows[0] });
  } catch (error) {
    console.error('Reject specialist error:', error);
    res.status(500).json({ error: { message: 'Nie udało się odrzucić zgłoszenia', status: 500 } });
  }
};

const removeSpecialist = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM "Specialist" WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Nie znaleziono specjalisty', status: 404 } });
    }
    res.json({ message: 'Specjalista został usunięty' });
  } catch (error) {
    console.error('Delete specialist error:', error);
    res.status(500).json({ error: { message: 'Nie udało się usunąć specjalisty', status: 500 } });
  }
};

module.exports = {
  getAll,
  getMine,
  create,
  getPending,
  approve,
  reject,
  removeSpecialist,
};
