const { query } = require('../config/database');

const VALID_TYPES = ['behaviorist', 'trainer', 'zoopsychologist', 'dietitian', 'hotel', 'petsitter'];
const VALID_SPECIES = ['dog', 'cat', 'both'];
const isInt = (v) => Number.isInteger(Number(v));
const bad = (res, message) => res.status(400).json({ error: { message, status: 400 } });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const SPECIALIST_FIELDS = `
  s.id, s.name, s.specialist_type, s.species, s.description, s.phone, s.email,
  s.website, s.city, s.address, s.latitude, s.longitude, s.price_info,
  s.photo_url, s.status, s.admin_notes, s.submitted_by, s.created_at, s.updated_at
`;

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
    const { type, species, lat, lng, city, search } = req.query;

    const conditions = [`s.status = 'approved'`];
    const params = [];

    if (type && VALID_TYPES.includes(type)) {
      params.push(type);
      conditions.push(`s.specialist_type = $${params.length}`);
    }
    if (species && VALID_SPECIES.includes(species)) {
      params.push(species);
      conditions.push(`(s.species = $${params.length} OR s.species = 'both')`);
    }
    if (city) {
      params.push(`%${city}%`);
      conditions.push(`(s.city ILIKE $${params.length} OR s.address ILIKE $${params.length})`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(s.name ILIKE $${params.length} OR s.description ILIKE $${params.length})`);
    }

    const result = await query(
      `SELECT ${SPECIALIST_FIELDS} FROM specialists s WHERE ${conditions.join(' AND ')} ORDER BY s.created_at DESC`,
      params
    );

    let specialists = result.rows;

    const userLat = lat != null && lat !== '' ? parseFloat(lat) : null;
    const userLng = lng != null && lng !== '' ? parseFloat(lng) : null;
    const hasLocation =
      userLat !== null && userLng !== null && !Number.isNaN(userLat) && !Number.isNaN(userLng);

    if (hasLocation) {
      specialists = specialists.map((s) => {
        const sLat = s.latitude != null ? parseFloat(s.latitude) : null;
        const sLng = s.longitude != null ? parseFloat(s.longitude) : null;
        const distanceKm =
          sLat !== null && sLng !== null
            ? Math.round(haversineKm(userLat, userLng, sLat, sLng) * 10) / 10
            : null;
        return { ...s, distanceKm };
      });
      specialists.sort((a, b) => {
        if (a.distanceKm == null && b.distanceKm == null) return 0;
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      });
    }

    res.json({ specialists, count: specialists.length });
  } catch (error) {
    console.error('Get specialists error:', error);
    res.status(500).json({ error: { message: 'Nie udało się pobrać listy specjalistów', status: 500 } });
  }
};

const getMine = async (req, res) => {
  try {
    const result = await query(
      `SELECT ${SPECIALIST_FIELDS} FROM specialists s WHERE s.submitted_by = $1 ORDER BY s.created_at DESC`,
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
    if (name.trim().length > 255) return bad(res, 'Nazwa może mieć maksymalnie 255 znaków');
    if (!VALID_TYPES.includes(specialistType)) {
      return res.status(400).json({ error: { message: 'Nieprawidłowy typ specjalisty', status: 400 } });
    }
    if (!city || !city.trim()) {
      return res.status(400).json({ error: { message: 'Miasto jest wymagane', status: 400 } });
    }
    if (city.trim().length > 100) return bad(res, 'Miasto może mieć maksymalnie 100 znaków');
    if (species && !VALID_SPECIES.includes(species)) {
      return res.status(400).json({ error: { message: 'Nieprawidłowa wartość gatunku', status: 400 } });
    }
    if (typeof description === 'string' && description.length > 2000) return bad(res, 'Opis może mieć maksymalnie 2000 znaków');
    if (typeof phone === 'string' && phone.length > 30) return bad(res, 'Telefon może mieć maksymalnie 30 znaków');
    if (email && (typeof email !== 'string' || email.length > 255 || !EMAIL_RE.test(email))) return bad(res, 'Nieprawidłowy adres e-mail');
    if (typeof website === 'string' && website.length > 255) return bad(res, 'Adres strony może mieć maksymalnie 255 znaków');
    if (typeof address === 'string' && address.length > 255) return bad(res, 'Adres może mieć maksymalnie 255 znaków');
    if (typeof priceInfo === 'string' && priceInfo.length > 255) return bad(res, 'Informacja o cenie może mieć maksymalnie 255 znaków');

    const lat = latitude != null && latitude !== '' ? Number(latitude) : null;
    const lng = longitude != null && longitude !== '' ? Number(longitude) : null;
    if (
      (lat != null && (Number.isNaN(lat) || lat < -90 || lat > 90)) ||
      (lng != null && (Number.isNaN(lng) || lng < -180 || lng > 180))
    ) {
      return res.status(400).json({ error: { message: 'Nieprawidłowe współrzędne', status: 400 } });
    }

    const result = await query(
      `INSERT INTO specialists
        (name, specialist_type, species, description, phone, email, website, city, address, latitude, longitude, price_info, status, submitted_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending', $13, NOW(), NOW())
       RETURNING *`,
      [
        name.trim(),
        specialistType,
        species || 'both',
        description || null,
        phone || null,
        email || null,
        website || null,
        city.trim(),
        address || null,
        lat,
        lng,
        priceInfo || null,
        req.user.userId,
      ]
    );

    // Powiadom adminów o nowym zgłoszeniu do weryfikacji
    const { notify } = require('./notifications.controller');
    const admins = await query("SELECT id FROM users WHERE role = 'admin'");
    for (const a of admins.rows) {
      notify(a.id, 'specialist_pending', 'Nowy profil specjalisty',
        `${name} (${city}) czeka na weryfikację.`, '/dashboard/admin/specialists');
    }

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
    const status = String(req.query.status || 'pending');
    const search = String(req.query.search || '').trim();

    const conditions = [];
    const params = [];

    if (status !== 'all') {
      if (!['pending', 'approved', 'rejected'].includes(status)) {
        return bad(res, 'Nieprawidłowy status');
      }
      params.push(status);
      conditions.push(`s.status = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(
        `(s.name ILIKE $${params.length} OR s.city ILIKE $${params.length} OR s.email ILIKE $${params.length}
          OR u.first_name ILIKE $${params.length} OR u.last_name ILIKE $${params.length})`
      );
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderDir = status === 'pending' ? 'ASC' : 'DESC';

    const result = await query(
      `SELECT ${SPECIALIST_FIELDS},
         u.first_name AS submitted_by_first_name,
         u.last_name AS submitted_by_last_name,
         u.email AS submitted_by_email
       FROM specialists s
       LEFT JOIN users u ON u.id = s.submitted_by
       ${whereClause}
       ORDER BY s.created_at ${orderDir}`,
      params
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
    if (!isInt(id)) return bad(res, 'Nieprawidłowy identyfikator specjalisty');
    const result = await query(
      `UPDATE specialists
       SET status = 'approved', reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING id, name, submitted_by`,
      [id, req.user.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Nie znaleziono zgłoszenia oczekującego na weryfikację', status: 404 } });
    }
    const { notify } = require('./notifications.controller');
    notify(result.rows[0].submitted_by, 'specialist_approved', 'Profil specjalisty zaakceptowany',
      `„${result.rows[0].name}" jest teraz widoczny dla wszystkich użytkowników.`, '/dashboard/specialists');
    res.json({ message: 'Specjalista został zatwierdzony' });
  } catch (error) {
    console.error('Approve specialist error:', error);
    res.status(500).json({ error: { message: 'Nie udało się zatwierdzić specjalisty', status: 500 } });
  }
};

const reject = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    if (!isInt(id)) return bad(res, 'Nieprawidłowy identyfikator specjalisty');
    if (typeof reason === 'string' && reason.length > 2000) return bad(res, 'Powód może mieć maksymalnie 2000 znaków');
    const result = await query(
      `UPDATE specialists
       SET status = 'rejected', admin_notes = $2, reviewed_by = $3, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING id, name, submitted_by`,
      [id, reason || null, req.user.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Nie znaleziono zgłoszenia oczekującego na weryfikację', status: 404 } });
    }
    const { notify } = require('./notifications.controller');
    notify(result.rows[0].submitted_by, 'specialist_rejected', 'Profil specjalisty odrzucony',
      `„${result.rows[0].name}" nie został zaakceptowany.${reason ? ` Powód: ${reason}` : ''}`, '/dashboard/specialists');
    res.json({ message: 'Zgłoszenie zostało odrzucone' });
  } catch (error) {
    console.error('Reject specialist error:', error);
    res.status(500).json({ error: { message: 'Nie udało się odrzucić zgłoszenia', status: 500 } });
  }
};

const removeSpecialist = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isInt(id)) return bad(res, 'Nieprawidłowy identyfikator specjalisty');
    const result = await query('DELETE FROM specialists WHERE id = $1 RETURNING id', [id]);
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
