const { query } = require('../config/database');
const { notify } = require('./notifications.controller');

const VALID_CATEGORIES = ['health', 'training', 'nutrition', 'behavior', 'breeding', 'other'];
const MAX_CONTENT_LEN = 10000;
const MAX_COMMENT_LEN = 2000;

const numId = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

// Pobiera post lub odpowiada 404. Zwraca wiersz lub null (po wysłaniu odpowiedzi).
const getPostOr404 = async (id, res) => {
  const r = await query('SELECT id, user_id, title FROM forum_posts WHERE id = $1', [id]);
  if (!r.rows[0]) {
    res.status(404).json({ error: { message: 'Post nie istnieje', status: 404 } });
    return null;
  }
  return r.rows[0];
};

const postRow = (r) => ({
  id: String(r.id),
  authorId: String(r.user_id),
  authorName: `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'Użytkownik',
  authorAvatar: r.avatar_url || null,
  category: r.category,
  title: r.title,
  content: r.content,
  likeCount: r.like_count,
  commentCount: r.comment_count,
  liked: !!r.liked,
  reported: !!r.reported,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const commentRow = (r) => ({
  id: String(r.id),
  authorId: String(r.user_id),
  authorName: `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'Użytkownik',
  authorAvatar: r.avatar_url || null,
  content: r.content,
  likeCount: r.like_count,
  liked: !!r.liked,
  createdAt: r.created_at,
});

// GET /api/forum/posts?category=health&search=xxx
const getPosts = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { category, search, mine } = req.query;
    const params = [userId];
    let sql = `
      SELECT p.id, p.user_id, p.category, p.title, p.content, p.created_at, p.updated_at,
             u.first_name, u.last_name, u.avatar_url,
             COALESCE(lc.c, 0)::int AS like_count,
             COALESCE(cc.c, 0)::int AS comment_count,
             EXISTS(SELECT 1 FROM forum_post_likes fl WHERE fl.post_id = p.id AND fl.user_id = $1) AS liked,
             EXISTS(SELECT 1 FROM forum_reports fr WHERE fr.post_id = p.id AND fr.user_id = $1) AS reported
      FROM forum_posts p
      JOIN users u ON u.id = p.user_id
      LEFT JOIN (SELECT post_id, COUNT(*) AS c FROM forum_post_likes GROUP BY post_id) lc ON lc.post_id = p.id
      LEFT JOIN (SELECT post_id, COUNT(*) AS c FROM forum_comments GROUP BY post_id) cc ON cc.post_id = p.id
      WHERE 1=1
    `;
    if (mine === '1' || mine === 'true') {
      sql += ' AND p.user_id = $1';
    }
    if (category && category !== 'all') {
      params.push(category);
      sql += ` AND p.category = $${params.length}`;
    }
    if (search) {
      params.push(`%${String(search).slice(0, 100)}%`);
      sql += ` AND (p.title ILIKE $${params.length} OR p.content ILIKE $${params.length})`;
    }
    sql += ' ORDER BY p.created_at DESC LIMIT 200';
    const result = await query(sql, params);
    res.json({ posts: result.rows.map(postRow), count: result.rows.length });
  } catch (error) {
    console.error('Forum getPosts error:', error);
    res.status(500).json({ error: { message: 'Nie udało się pobrać postów', status: 500 } });
  }
};

// POST /api/forum/posts
const createPost = async (req, res) => {
  try {
    const { category, title, content } = req.body;
    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({ error: { message: 'Tytuł i treść są wymagane', status: 400 } });
    }
    const cat = VALID_CATEGORIES.includes(category) ? category : 'other';
    const result = await query(
      `INSERT INTO forum_posts (user_id, category, title, content) VALUES ($1, $2, $3, $4) RETURNING id`,
      [req.user.userId, cat, title.trim().slice(0, 200), content.trim().slice(0, MAX_CONTENT_LEN)]
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (error) {
    console.error('Forum createPost error:', error);
    res.status(500).json({ error: { message: 'Nie udało się utworzyć posta', status: 500 } });
  }
};

// PATCH /api/forum/posts/:id — tylko autor
const updatePost = async (req, res) => {
  try {
    const postId = numId(req.params.id);
    if (!postId) return res.status(400).json({ error: { message: 'Nieprawidłowe ID posta', status: 400 } });
    const { category, title, content } = req.body;
    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({ error: { message: 'Tytuł i treść są wymagane', status: 400 } });
    }
    const cat = VALID_CATEGORIES.includes(category) ? category : 'other';
    const result = await query(
      `UPDATE forum_posts SET title = $1, content = $2, category = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND user_id = $5 RETURNING id`,
      [title.trim().slice(0, 200), content.trim().slice(0, MAX_CONTENT_LEN), cat, postId, req.user.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Post nie istnieje lub nie jest Twój', status: 404 } });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Forum updatePost error:', error);
    res.status(500).json({ error: { message: 'Nie udało się zaktualizować posta', status: 500 } });
  }
};

// DELETE /api/forum/posts/:id — tylko autor
const deletePost = async (req, res) => {
  try {
    const postId = numId(req.params.id);
    if (!postId) return res.status(400).json({ error: { message: 'Nieprawidłowe ID posta', status: 400 } });
    const roleRes = await query('SELECT role FROM users WHERE id = $1', [req.user.userId]);
    const isAdmin = roleRes.rows[0]?.role === 'admin';
    const result = await query(
      isAdmin
        ? 'DELETE FROM forum_posts WHERE id = $1 RETURNING id'
        : 'DELETE FROM forum_posts WHERE id = $1 AND user_id = $2 RETURNING id',
      isAdmin ? [postId] : [postId, req.user.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Post nie istnieje lub nie jest Twój', status: 404 } });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Forum deletePost error:', error);
    res.status(500).json({ error: { message: 'Nie udało się usunąć posta', status: 500 } });
  }
};

// POST /api/forum/posts/:id/like — toggle
const togglePostLike = async (req, res) => {
  try {
    const postId = numId(req.params.id);
    if (!postId) return res.status(400).json({ error: { message: 'Nieprawidłowe ID posta', status: 400 } });
    const userId = req.user.userId;
    if (!(await getPostOr404(postId, res))) return;
    // Atomowy toggle: brak wiersza = polubienie udane, konflikt = usuń like
    const ins = await query(
      'INSERT INTO forum_post_likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING post_id',
      [postId, userId]
    );
    if (ins.rows.length === 0) {
      await query('DELETE FROM forum_post_likes WHERE post_id = $1 AND user_id = $2', [postId, userId]);
    }
    const c = await query('SELECT COUNT(*)::int AS c FROM forum_post_likes WHERE post_id = $1', [postId]);
    res.json({ liked: ins.rows.length > 0, likeCount: c.rows[0].c });
  } catch (error) {
    console.error('Forum like error:', error);
    res.status(500).json({ error: { message: 'Nie udało się polubić posta', status: 500 } });
  }
};

// POST /api/forum/posts/:id/report
const reportPost = async (req, res) => {
  try {
    const postId = numId(req.params.id);
    if (!postId) return res.status(400).json({ error: { message: 'Nieprawidłowe ID posta', status: 400 } });
    if (!(await getPostOr404(postId, res))) return;
    await query(
      'INSERT INTO forum_reports (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [postId, req.user.userId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Forum report error:', error);
    res.status(500).json({ error: { message: 'Nie udało się zgłosić posta', status: 500 } });
  }
};

// GET /api/forum/posts/:id/comments
const getComments = async (req, res) => {
  try {
    const postId = numId(req.params.id);
    if (!postId) return res.status(400).json({ error: { message: 'Nieprawidłowe ID posta', status: 400 } });
    if (!(await getPostOr404(postId, res))) return;
    const result = await query(
      `SELECT c.id, c.user_id, c.content, c.created_at, u.first_name, u.last_name, u.avatar_url,
              COALESCE(lc.c, 0)::int AS like_count,
              EXISTS(SELECT 1 FROM forum_comment_likes cl WHERE cl.comment_id = c.id AND cl.user_id = $2) AS liked
       FROM forum_comments c
       JOIN users u ON u.id = c.user_id
       LEFT JOIN (SELECT comment_id, COUNT(*) AS c FROM forum_comment_likes GROUP BY comment_id) lc ON lc.comment_id = c.id
       WHERE c.post_id = $1
       ORDER BY c.created_at ASC`,
      [postId, req.user.userId]
    );
    res.json({ comments: result.rows.map(commentRow) });
  } catch (error) {
    console.error('Forum getComments error:', error);
    res.status(500).json({ error: { message: 'Nie udało się pobrać komentarzy', status: 500 } });
  }
};

// POST /api/forum/posts/:id/comments
const addComment = async (req, res) => {
  try {
    const postId = numId(req.params.id);
    if (!postId) return res.status(400).json({ error: { message: 'Nieprawidłowe ID posta', status: 400 } });
    const { content } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({ error: { message: 'Komentarz nie może być pusty', status: 400 } });
    }
    if (content.trim().length > MAX_COMMENT_LEN) {
      return res.status(400).json({ error: { message: `Komentarz może mieć maks. ${MAX_COMMENT_LEN} znaków`, status: 400 } });
    }
    const post = await query(
      `SELECT p.user_id, p.title, u.first_name FROM forum_posts p JOIN users u ON u.id = $2 WHERE p.id = $1`,
      [postId, req.user.userId]
    );
    if (!post.rows[0]) {
      return res.status(404).json({ error: { message: 'Post nie istnieje', status: 404 } });
    }
    const result = await query(
      `INSERT INTO forum_comments (post_id, user_id, content) VALUES ($1, $2, $3) RETURNING id`,
      [postId, req.user.userId, content.trim()]
    );
    if (post.rows[0] && post.rows[0].user_id !== req.user.userId) {
      notify(
        post.rows[0].user_id,
        'forum_comment',
        'Nowy komentarz do Twojego posta',
        `${post.rows[0].first_name || 'Ktoś'} skomentował: „${post.rows[0].title}”`,
        '/dashboard/forum'
      ).catch(() => {});
    }

    res.status(201).json({ id: result.rows[0].id });
  } catch (error) {
    console.error('Forum addComment error:', error);
    res.status(500).json({ error: { message: 'Nie udało się dodać komentarza', status: 500 } });
  }
};

// DELETE /api/forum/comments/:id — tylko autor
const deleteComment = async (req, res) => {
  try {
    const commentId = numId(req.params.id);
    if (!commentId) return res.status(400).json({ error: { message: 'Nieprawidłowe ID komentarza', status: 400 } });
    const result = await query('DELETE FROM forum_comments WHERE id = $1 AND user_id = $2 RETURNING id, post_id', [
      commentId,
      req.user.userId,
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Komentarz nie istnieje lub nie jest Twój', status: 404 } });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Forum deleteComment error:', error);
    res.status(500).json({ error: { message: 'Nie udało się usunąć komentarza', status: 500 } });
  }
};

// POST /api/forum/comments/:id/like — toggle
const toggleCommentLike = async (req, res) => {
  try {
    const commentId = numId(req.params.id);
    if (!commentId) return res.status(400).json({ error: { message: 'Nieprawidłowe ID komentarza', status: 400 } });
    const userId = req.user.userId;
    const exists = await query('SELECT 1 FROM forum_comments WHERE id = $1', [commentId]);
    if (!exists.rows.length) {
      return res.status(404).json({ error: { message: 'Komentarz nie istnieje', status: 404 } });
    }
    const ins = await query(
      'INSERT INTO forum_comment_likes (comment_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING comment_id',
      [commentId, userId]
    );
    if (ins.rows.length === 0) {
      await query('DELETE FROM forum_comment_likes WHERE comment_id = $1 AND user_id = $2', [commentId, userId]);
    }
    const c = await query('SELECT COUNT(*)::int AS c FROM forum_comment_likes WHERE comment_id = $1', [commentId]);
    res.json({ liked: ins.rows.length > 0, likeCount: c.rows[0].c });
  } catch (error) {
    console.error('Forum comment like error:', error);
    res.status(500).json({ error: { message: 'Nie udało się polubić komentarza', status: 500 } });
  }
};

module.exports = {
  getPosts, createPost, updatePost, deletePost,
  togglePostLike, reportPost,
  getComments, addComment, deleteComment, toggleCommentLike,
};
