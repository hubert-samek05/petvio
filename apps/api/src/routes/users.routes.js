const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');
const { query } = require('../config/database');

router.get('/count', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await query('SELECT COUNT(*) as count FROM "User"');
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Error getting user count:', error);
    res.status(500).json({ error: 'Wystąpił błąd podczas pobierania liczby użytkowników' });
  }
});

router.get('/pets/count', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await query('SELECT COUNT(*) as count FROM "Pet"');
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Error getting pets count:', error);
    res.status(500).json({ error: 'Wystąpił błąd podczas pobierania liczby zwierząt' });
  }
});

router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let whereClause = '';
    let params = [];

    if (search) {
      whereClause = 'WHERE email ILIKE $1 OR name ILIKE $1';
      params.push(`%${search}%`);
    }

    const result = await query(
      `SELECT id, email, name, role, phone, "createdAt" 
       FROM "User" ${whereClause} 
       ORDER BY "createdAt" DESC 
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) as count FROM "User" ${whereClause}`,
      params
    );

    res.json({
      users: result.rows.map(u => ({
        id: u.id,
        email: u.email,
        first_name: u.name,
        last_name: '',
        role: u.role,
        phone: u.phone,
        created_at: u.createdAt
      })),
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
    });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: 'Wystąpił błąd podczas pobierania użytkowników' });
  }
});

router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, email, name, role, phone, "avatarUrl", "createdAt" FROM "User" WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Użytkownik nie został znaleziony' });
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      first_name: user.name,
      last_name: '',
      role: user.role,
      phone: user.phone,
      avatar_url: user.avatarUrl,
      created_at: user.createdAt
    });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: 'Wystąpił błąd podczas pobierania użytkownika' });
  }
});

router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { role, phone } = req.body;
    const result = await query(
      'UPDATE "User" SET role = $1, phone = $2, "updatedAt" = NOW() WHERE id = $3 RETURNING id, email, name, role, phone',
      [role, phone, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Użytkownik nie został znaleziony' });
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      first_name: user.name,
      last_name: '',
      role: user.role,
      phone: user.phone
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Wystąpił błąd podczas aktualizacji użytkownika' });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await query('DELETE FROM "User" WHERE id = $1 RETURNING id', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Użytkownik nie został znaleziony' });
    }

    res.json({ message: 'Użytkownik został usunięty' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Wystąpił błąd podczas usuwania użytkownika' });
  }
});

module.exports = router;
