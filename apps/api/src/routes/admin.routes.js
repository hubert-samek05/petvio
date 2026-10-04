const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');
const { query } = require('../config/database');

// Subscriptions
router.get('/subscriptions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT s.id, s.user_id, s.plan, s.status, s.start_date, s.end_date, 
              u.email, u.first_name, u.last_name
       FROM "Subscription" s
       JOIN "User" u ON s.user_id = u.id
       ORDER BY s.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await query('SELECT COUNT(*) as count FROM "Subscription"');

    res.json({
      subscriptions: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
    });
  } catch (error) {
    console.error('Error getting subscriptions:', error);
    res.status(500).json({ error: 'Wystąpił błąd podczas pobierania subskrypcji' });
  }
});

// Forum posts
router.get('/forum-posts', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT p.id, p.title, p.content, p.status, p.created_at, 
              u.email, u.first_name, u.last_name
       FROM "Post" p
       JOIN "User" u ON p.user_id = u.id
       ORDER BY p.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await query('SELECT COUNT(*) as count FROM "Post"');

    res.json({
      posts: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
    });
  } catch (error) {
    console.error('Error getting forum posts:', error);
    res.status(500).json({ error: 'Wystąpił błąd podczas pobierania postów forum' });
  }
});

// Hotels/Petsitters (from PetPlace table)
router.get('/places', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT pp.id, pp.name, pp.type, pp.status, pp.created_at,
              u.email, u.first_name, u.last_name
       FROM "PetPlace" pp
       JOIN "User" u ON pp.user_id = u.id
       ORDER BY pp.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await query('SELECT COUNT(*) as count FROM "PetPlace"');

    res.json({
      places: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
    });
  } catch (error) {
    console.error('Error getting places:', error);
    res.status(500).json({ error: 'Wystąpił błąd podczas pobierania miejsc' });
  }
});

// Blog posts
router.get('/blog-posts', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT bp.id, bp.title, bp.content, bp.status, bp.published_at, bp.created_at,
              u.email, u.first_name, u.last_name
       FROM "BlogPost" bp
       JOIN "User" u ON bp.user_id = u.id
       ORDER BY bp.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await query('SELECT COUNT(*) as count FROM "BlogPost"');

    res.json({
      posts: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
    });
  } catch (error) {
    console.error('Error getting blog posts:', error);
    res.status(500).json({ error: 'Wystąpił błąd podczas pobierania postów blogowych' });
  }
});

router.put('/blog-posts/:id/publish', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await query(
      'UPDATE "BlogPost" SET status = $1, published_at = NOW() WHERE id = $2 RETURNING *',
      ['published', req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post nie został znaleziony' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error publishing blog post:', error);
    res.status(500).json({ error: 'Wystąpił błąd podczas publikacji postu' });
  }
});

router.put('/blog-posts/:id/unpublish', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await query(
      'UPDATE "BlogPost" SET status = $1, published_at = NULL WHERE id = $2 RETURNING *',
      ['draft', req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post nie został znaleziony' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error unpublishing blog post:', error);
    res.status(500).json({ error: 'Wystąpił błąd podczas cofnięcia publikacji' });
  }
});

module.exports = router;
