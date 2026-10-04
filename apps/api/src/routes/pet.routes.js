const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');
const { query } = require('../config/database');
const petController = require('../controllers/pet.controller');

router.use(authenticateToken);

router.get('/', petController.getAllPets);
router.post('/', petController.createPet);
router.get('/:id', petController.getPetById);
router.put('/:id', petController.updatePet);
router.delete('/:id', petController.deletePet);

// Admin endpoints
router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let whereClause = '';
    let params = [];

    if (search) {
      whereClause = 'WHERE p.name ILIKE $1 OR p.breed ILIKE $1 OR u.email ILIKE $1';
      params.push(`%${search}%`);
    }

    const result = await query(
      `SELECT p.id, p.name, p.species, p.breed, p."birthDate", p.sex, p."weightKg", 
              p."createdAt", u.id as user_id, u.email, u.name
       FROM "Pet" p
       JOIN "User" u ON p."ownerId" = u.id
       ${whereClause}
       ORDER BY p."createdAt" DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) as count FROM "Pet" p JOIN "User" u ON p."ownerId" = u.id ${whereClause}`,
      params
    );

    res.json({
      pets: result.rows.map(p => ({
        id: p.id,
        name: p.name,
        species: p.species,
        breed: p.breed,
        birth_date: p.birthDate,
        gender: p.sex,
        weight: p.weightKg,
        created_at: p.createdAt,
        user_id: p.user_id,
        email: p.email,
        first_name: p.name,
        last_name: ''
      })),
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
    });
  } catch (error) {
    console.error('Error getting all pets:', error);
    res.status(500).json({ error: 'Wystąpił błąd podczas pobierania zwierząt' });
  }
});

module.exports = router;
