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
router.get('/admin/all', requireAdmin, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const offset = (page - 1) * limit;
    const search = (req.query.search || '').trim();

    let whereClause = '';
    let params = [];

    if (search) {
      whereClause = 'WHERE p.name ILIKE $1 OR p.breed ILIKE $1 OR u.email ILIKE $1';
      params.push(`%${search}%`);
    }

    const result = await query(
      `SELECT p.id, p.name, p.species, p.breed, p.birth_date, p.gender, p.weight,
              p.created_at, u.id as user_id, u.email, u.first_name, u.last_name
       FROM pets p
       JOIN users u ON p.user_id = u.id
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) as count FROM pets p JOIN users u ON p.user_id = u.id ${whereClause}`,
      params
    );

    res.json({
      pets: result.rows,
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
