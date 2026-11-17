const { query } = require('../config/database');
const { notify } = require('./notifications.controller');
const {
  VALID_REACTIONS,
  fullName,
  walkFromRow,
  WALK_SELECT,
  WALK_JOIN,
  sanitizeImages,
  sanitizeVideo,
  sanitizeMusic,
  commentRow,
} = require('./social.helpers');

const postRow = (r) => ({
  id: String(r.id),
  authorId: String(r.user_id),
  authorName: r.page_id ? r.page_name : fullName(r),
  authorAvatar: r.page_id ? (r.page_avatar_url || null) : (r.avatar_url || null),
  authorPageId: r.page_id ? String(r.page_id) : null,
  wallOwnerId: r.wall_user_id ? String(r.wall_user_id) : null,
  wallOwnerName: r.wall_user_id ? `${r.wall_first_name || ''} ${r.wall_last_name || ''}`.trim() || 'Użytkownik' : null,
  visibility: r.visibility || 'public',
  content: r.content,
  feeling: r.feeling || null,
  location: r.location || null,
  background: r.background || null,
  images: Array.isArray(r.images) ? r.images : [],
  postType: r.post_type || 'text',
  video: r.video || null,
  music: r.music && typeof r.music === 'object' ? r.music : null,
  walk: walkFromRow(r),
  status: r.status || undefined,
  pinned: !!r.pinned || undefined,
  reactionCounts: r.reaction_counts || {},
  totalReactions: r.total_reactions || 0,
  myReaction: r.my_reaction || null,
  commentCount: r.comment_count || 0,
  createdAt: r.created_at,
});

const POST_SELECT = `
  SELECT p.id, p.user_id, p.content, p.images, p.post_type, p.video, p.music, p.walk_id, p.created_at,
         p.wall_user_id, wo.first_name AS wall_first_name, wo.last_name AS wall_last_name,
         p.visibility, p.page_id, bp.name AS page_name, bp.avatar_url AS page_avatar_url,
         p.feeling, p.location, p.background,
         u.first_name, u.last_name, u.avatar_url,${WALK_SELECT},
         (SELECT COALESCE(jsonb_object_agg(reaction, c), '{}'::jsonb)
            FROM (SELECT reaction, COUNT(*)::int AS c FROM user_post_reactions WHERE post_id = p.id GROUP BY reaction) rc
         ) AS reaction_counts,
         (SELECT COUNT(*)::int FROM user_post_reactions WHERE post_id = p.id) AS total_reactions,
         (SELECT reaction FROM user_post_reactions WHERE post_id = p.id AND user_id = $1) AS my_reaction,
         (SELECT COUNT(*)::int FROM user_post_comments WHERE post_id = p.id) AS comment_count
  FROM user_posts p
  JOIN users u ON u.id = p.user_id
  LEFT JOIN users wo ON wo.id = p.wall_user_id
  LEFT JOIN business_pages bp ON bp.id = p.page_id${WALK_JOIN}`;

// Dozwolone tła postów tekstowych (klucze mapowane na gradienty w UI)
const POST_BACKGROUNDS = ['mint', 'sunset', 'ocean', 'berry', 'amber', 'night', 'lavender'];

// Widoczność posta dla widzącgo $1: własne / publiczne / znajomi autora.
// Blokada w którąkolwiek stronę ukrywa post wzajemnie.
const VISIBILITY_COND = `(
    p.user_id = $1
    OR (
      NOT EXISTS (SELECT 1 FROM user_blocks b
        WHERE (b.blocker_id = $1 AND b.blocked_id = p.user_id)
           OR (b.blocker_id = p.user_id AND b.blocked_id = $1))
      AND (
        p.visibility = 'public'
        OR (p.visibility = 'friends'
            AND EXISTS (SELECT 1 FROM friendships f WHERE f.status = 'accepted'
                AND ((f.requester_id = $1 AND f.addressee_id = p.user_id)
                  OR (f.requester_id = p.user_id AND f.addressee_id = $1))))
      )
    )`;

// JS-owa wersja sprawdzenia dla pojedynczego posta (reakcje/komentarze po ID)
const canViewPost = async (post, userId) => {
  if (post.user_id === userId) return true;
  if (post.visibility === 'only_me') return false;
  const blocked = await query(
    `SELECT 1 FROM user_blocks WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)`,
    [userId, post.user_id]
  );
  if (blocked.rows.length) return false;
  if (post.visibility === 'public') return true;
  const fr = await query(
    `SELECT 1 FROM friendships WHERE status = 'accepted'
       AND ((requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1))`,
    [userId, post.user_id]
  );
  return fr.rows.length > 0;
};

// GET /api/posts?author=me&user_id=N&type=reel&sort=foryou|newest|oldest|popular
const getPosts = async (req, res) => {
  try {
    const userId = req.user.userId;
    let sql = POST_SELECT;
    const params = [userId];
    const conds = [];
    if (req.query.author === 'me') {
      conds.push('p.user_id = $1');
    }
    const pageId = parseInt(req.query.page_id, 10);
    if (Number.isFinite(pageId)) {
      params.push(pageId);
      conds.push(`p.page_id = $${params.length}`);
    }
    const wallId = parseInt(req.query.user_id, 10);
    if (Number.isFinite(wallId)) {
      params.push(wallId);
      // tablica osoby: jej posty ORAZ posty napisane na jej tablicy
      conds.push(`(p.user_id = $${params.length} OR p.wall_user_id = $${params.length})`);
    } else {
      // feed główny: bez postów pisanych na cudzych tablicach
      conds.push('p.wall_user_id IS NULL');
    }
    // Prywatność: public/friends/only_me + blokady
    conds.push(VISIBILITY_COND + ')');
    if (req.query.type === 'reel') {
      conds.push(`p.post_type = 'reel'`, 'p.video IS NOT NULL');
    }
    if (conds.length) sql += ` WHERE ${conds.join(' AND ')}`;
    const sort = String(req.query.sort || 'foryou');
    if (sort === 'oldest') sql += ' ORDER BY p.created_at ASC LIMIT 100';
    else if (sort === 'popular') sql += ` ORDER BY (
        (SELECT COUNT(*) FROM user_post_reactions WHERE post_id = p.id)
        + (SELECT COUNT(*) FROM user_post_comments WHERE post_id = p.id)
      ) DESC, p.created_at DESC LIMIT 100`;
    else if (sort === 'newest') sql += ' ORDER BY p.created_at DESC LIMIT 100';
    else sql += ` ORDER BY
        CASE WHEN p.user_id = $1 OR p.user_id IN (
          SELECT CASE WHEN requester_id = $1 THEN addressee_id ELSE requester_id END
            FROM friendships WHERE status = 'accepted' AND (requester_id = $1 OR addressee_id = $1)
          UNION SELECT followee_id FROM follows WHERE follower_id = $1
        ) THEN 0 ELSE 1 END,
        (SELECT COUNT(*) FROM user_post_reactions WHERE post_id = p.id)
          + (SELECT COUNT(*) FROM user_post_comments WHERE post_id = p.id) DESC,
        p.created_at DESC
        LIMIT 100`;
    const r = await query(sql, params);
    res.json({ posts: r.rows.map(postRow) });
  } catch (error) {
    console.error('Posts list error:', error);
    res.status(500).json({ error: { message: 'Nie udało się pobrać postów', status: 500 } });
  }
};

// POST /api/posts {content, images, video, music, walkId, wallUserId}
const createPost = async (req, res) => {
  try {
    const userId = req.user.userId;
    const content = String(req.body?.content || '').trim().slice(0, 5000);
    const images = sanitizeImages(req.body?.images);
    const video = sanitizeVideo(req.body?.video);
    const music = sanitizeMusic(req.body?.music);
    const walkIdRaw = req.body?.walkId;
    const walkId = walkIdRaw !== undefined && walkIdRaw !== null && walkIdRaw !== ''
      ? parseInt(walkIdRaw, 10) : null;
    const wallRaw = req.body?.wallUserId;
    const wallUserId = wallRaw !== undefined && wallRaw !== null && wallRaw !== ''
      ? parseInt(wallRaw, 10) : null;
    const pageRaw = req.body?.pageId;
    const pageId = pageRaw !== undefined && pageRaw !== null && pageRaw !== ''
      ? parseInt(pageRaw, 10) : null;
    const visibility = ['public', 'friends', 'only_me'].includes(req.body?.visibility)
      ? req.body.visibility
      : 'public';

    // Post jako strona firmowa — tylko właściciel strony, zawsze publiczny
    if (pageId !== null) {
      if (!Number.isFinite(pageId)) {
        return res.status(400).json({ error: { message: 'Nieprawidłowa strona', status: 400 } });
      }
      const pg = await query('SELECT id FROM business_pages WHERE id = $1 AND owner_id = $2', [pageId, userId]);
      if (pg.rows.length === 0) {
        return res.status(403).json({ error: { message: 'To nie jest Twoja strona', status: 403 } });
      }
    }

    if (walkId !== null) {
      if (!Number.isFinite(walkId)) {
        return res.status(400).json({ error: { message: 'Nieprawidłowy spacer', status: 400 } });
      }
      const w = await query('SELECT id FROM walks WHERE id = $1 AND user_id = $2', [walkId, userId]);
      if (w.rows.length === 0) {
        return res.status(404).json({ error: { message: 'Spacer nie został znaleziony', status: 404 } });
      }
    }

    // Pisanie na cudzej tablicy — tylko znajomi, jeśli właściciel zezwala
    if (wallUserId !== null) {
      if (!Number.isFinite(wallUserId) || wallUserId === userId) {
        return res.status(400).json({ error: { message: 'Nieprawidłowa tablica', status: 400 } });
      }
      const owner = await query(
        `SELECT u.wall_setting,
                EXISTS (SELECT 1 FROM friendships WHERE status = 'accepted'
                        AND ((requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1))) AS is_friend,
                EXISTS (SELECT 1 FROM user_blocks WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)) AS blocked
           FROM users u WHERE u.id = $2`,
        [userId, wallUserId]
      );
      const o = owner.rows[0];
      if (!o) return res.status(404).json({ error: { message: 'Użytkownik nie został znaleziony', status: 404 } });
      if (o.blocked || o.wall_setting !== 'friends' || !o.is_friend) {
        return res.status(403).json({ error: { message: 'Ta osoba nie pozwala publikować na swojej tablicy', status: 403 } });
      }
    }

    const postType = video ? 'reel' : walkId !== null ? 'walk' : 'text';
    if (!content && images.length === 0 && !video && !music && walkId === null) {
      return res.status(400).json({ error: { message: 'Post nie może być pusty', status: 400 } });
    }
    // Elementy interaktywne posta
    const feeling = String(req.body?.feeling || '').trim().slice(0, 60) || null;
    const location = String(req.body?.location || '').trim().slice(0, 120) || null;
    const hasMedia = images.length > 0 || video || music || walkId !== null;
    const background = !hasMedia && POST_BACKGROUNDS.includes(req.body?.background)
      ? req.body.background
      : null;
    // Na cudzej tablicy i jako strona — zawsze publiczne
    const finalVisibility = (wallUserId !== null || pageId !== null) ? 'public' : visibility;
    const ins = await query(
      `INSERT INTO user_posts (user_id, content, images, post_type, video, music, walk_id, wall_user_id, visibility, page_id, feeling, location, background)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
      [userId, content, JSON.stringify(images), postType, video, music ? JSON.stringify(music) : null, walkId, wallUserId, finalVisibility, pageId, feeling, location, background]
    );
    if (wallUserId) {
      const me = await query('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
      notify(wallUserId, 'wall_post', 'Nowy post na Twojej tablicy', `${fullName(me.rows[0] || {})} opublikował(a) coś na Twojej tablicy.`, `/dashboard/community/user/${wallUserId}`);
    }
    const r = await query(`${POST_SELECT} WHERE p.id = $2`, [userId, ins.rows[0].id]);
    res.status(201).json({ post: postRow(r.rows[0]) });
  } catch (error) {
    console.error('Post create error:', error);
    res.status(500).json({ error: { message: 'Nie udało się dodać posta', status: 500 } });
  }
};

const getPostRow = async (id) => {
  const r = await query('SELECT * FROM user_posts WHERE id = $1', [id]);
  return r.rows[0] || null;
};

// PATCH /api/posts/:id — autor
const updatePost = async (req, res) => {
  try {
    const userId = req.user.userId;
    const p = await getPostRow(req.params.id);
    if (!p) return res.status(404).json({ error: { message: 'Post nie został znaleziony', status: 404 } });
    if (p.user_id !== userId) {
      return res.status(403).json({ error: { message: 'Możesz edytować tylko własne posty', status: 403 } });
    }
    const content = req.body?.content !== undefined ? String(req.body.content).trim().slice(0, 5000) : p.content;
    const images = req.body?.images !== undefined ? sanitizeImages(req.body.images) : p.images;
    const music = req.body?.music !== undefined ? sanitizeMusic(req.body.music) : p.music;
    const visibility = ['public', 'friends', 'only_me'].includes(req.body?.visibility)
      ? req.body.visibility
      : p.visibility;
    const feeling = req.body?.feeling !== undefined
      ? String(req.body.feeling || '').trim().slice(0, 60) || null : p.feeling;
    const location = req.body?.location !== undefined
      ? String(req.body.location || '').trim().slice(0, 120) || null : p.location;
    const hasMediaU = (Array.isArray(images) && images.length > 0) || p.video || music || p.walk_id;
    const background = req.body?.background !== undefined
      ? (!hasMediaU && POST_BACKGROUNDS.includes(req.body.background) ? req.body.background : null)
      : (hasMediaU ? null : p.background);
    if (!content && (!Array.isArray(images) || images.length === 0) && !p.video && !p.walk_id && !music) {
      return res.status(400).json({ error: { message: 'Post nie może być pusty', status: 400 } });
    }
    await query(
      'UPDATE user_posts SET content = $1, images = $2, music = $3, visibility = $4, feeling = $5, location = $6, background = $7, updated_at = CURRENT_TIMESTAMP WHERE id = $8',
      [content, JSON.stringify(images), music ? JSON.stringify(music) : null, p.page_id ? 'public' : visibility, feeling, location, background, p.id]
    );
    const r = await query(`${POST_SELECT} WHERE p.id = $2`, [userId, p.id]);
    res.json({ post: postRow(r.rows[0]) });
  } catch (error) {
    console.error('Post update error:', error);
    res.status(500).json({ error: { message: 'Nie udało się zaktualizować posta', status: 500 } });
  }
};

// DELETE /api/posts/:id — autor
const deletePost = async (req, res) => {
  try {
    const userId = req.user.userId;
    const p = await getPostRow(req.params.id);
    if (!p) return res.status(404).json({ error: { message: 'Post nie został znaleziony', status: 404 } });
    if (p.user_id !== userId && p.wall_user_id !== userId) {
      return res.status(403).json({ error: { message: 'Możesz usuwać tylko własne posty lub posty na swojej tablicy', status: 403 } });
    }
    await query('DELETE FROM user_posts WHERE id = $1', [p.id]);
    res.json({ ok: true });
  } catch (error) {
    console.error('Post delete error:', error);
    res.status(500).json({ error: { message: 'Nie udało się usunąć posta', status: 500 } });
  }
};

// POST /api/posts/:id/react {reaction}
const reactPost = async (req, res) => {
  try {
    const userId = req.user.userId;
    const p = await getPostRow(req.params.id);
    if (!p || !(await canViewPost(p, userId))) {
      return res.status(404).json({ error: { message: 'Post nie został znaleziony', status: 404 } });
    }
    const reaction = req.body?.reaction;
    if (reaction !== null && !VALID_REACTIONS.includes(reaction)) {
      return res.status(400).json({ error: { message: 'Nieprawidłowa reakcja', status: 400 } });
    }
    const existing = await query('SELECT reaction FROM user_post_reactions WHERE post_id = $1 AND user_id = $2', [p.id, userId]);
    if (reaction === null || (existing.rows[0] && existing.rows[0].reaction === reaction)) {
      await query('DELETE FROM user_post_reactions WHERE post_id = $1 AND user_id = $2', [p.id, userId]);
    } else {
      await query(
        `INSERT INTO user_post_reactions (post_id, user_id, reaction) VALUES ($1, $2, $3)
         ON CONFLICT (post_id, user_id) DO UPDATE SET reaction = $3`,
        [p.id, userId, reaction]
      );
      // powiadom autora o pierwszej reakcji (nie przy zmianie reakcji ani na własny post)
      if (!existing.rows[0] && p.user_id !== userId) {
        const me = await query('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
        const emoji = { like: '👍', love: '❤️', haha: '😂', wow: '😮', sad: '😢' }[reaction] || '👍';
        notify(
          p.user_id, 'post_reaction', `${emoji} Nowa reakcja na Twój post`,
          `${fullName(me.rows[0] || {})} zareagował(a) na Twój post.`, '/dashboard/community'
        );
      }
    }
    const r = await query(`${POST_SELECT} WHERE p.id = $2`, [userId, p.id]);
    res.json({ post: postRow(r.rows[0]) });
  } catch (error) {
    console.error('Post react error:', error);
    res.status(500).json({ error: { message: 'Nie udało się zapisać reakcji', status: 500 } });
  }
};

// GET /api/posts/:id/comments
const getComments = async (req, res) => {
  try {
    const p = await getPostRow(req.params.id);
    if (!p || !(await canViewPost(p, req.user.userId))) {
      return res.status(404).json({ error: { message: 'Post nie został znaleziony', status: 404 } });
    }
    const r = await query(
      `SELECT c.id, c.user_id, c.content, c.created_at, u.first_name, u.last_name, u.avatar_url
       FROM user_post_comments c JOIN users u ON u.id = c.user_id
       WHERE c.post_id = $1 ORDER BY c.created_at LIMIT 200`,
      [req.params.id]
    );
    res.json({ comments: r.rows.map(commentRow) });
  } catch (error) {
    console.error('Post comments error:', error);
    res.status(500).json({ error: { message: 'Nie udało się pobrać komentarzy', status: 500 } });
  }
};

// POST /api/posts/:id/comments
const addComment = async (req, res) => {
  try {
    const userId = req.user.userId;
    const p = await getPostRow(req.params.id);
    if (!p || !(await canViewPost(p, userId))) {
      return res.status(404).json({ error: { message: 'Post nie został znaleziony', status: 404 } });
    }
    const content = String(req.body?.content || '').trim().slice(0, 2000);
    if (!content) {
      return res.status(400).json({ error: { message: 'Komentarz nie może być pusty', status: 400 } });
    }
    const ins = await query(
      'INSERT INTO user_post_comments (post_id, user_id, content) VALUES ($1, $2, $3) RETURNING id',
      [p.id, userId, content]
    );
    if (p.user_id !== userId || (p.wall_user_id && p.wall_user_id !== userId)) {
      const me = await query('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
      const name = fullName(me.rows[0] || {});
      if (p.user_id !== userId) {
        notify(p.user_id, 'post_comment', 'Nowy komentarz do Twojego posta', `${name} skomentował(a) Twój post.`, '/dashboard/community');
      }
      // komentarz pod postem na cudzej tablicy — daj znać też właścicielowi tablicy
      if (p.wall_user_id && p.wall_user_id !== userId && p.wall_user_id !== p.user_id) {
        notify(p.wall_user_id, 'post_comment', 'Nowy komentarz na Twojej tablicy', `${name} skomentował(a) post na Twojej tablicy.`, `/dashboard/community/user/${p.wall_user_id}`);
      }
    }
    const r = await query(
      `SELECT c.id, c.user_id, c.content, c.created_at, u.first_name, u.last_name, u.avatar_url
       FROM user_post_comments c JOIN users u ON u.id = c.user_id WHERE c.id = $1`,
      [ins.rows[0].id]
    );
    res.status(201).json({ comment: commentRow(r.rows[0]) });
  } catch (error) {
    console.error('Post comment add error:', error);
    res.status(500).json({ error: { message: 'Nie udało się dodać komentarza', status: 500 } });
  }
};

// DELETE /api/posts/comments/:id — autor komentarza lub autor posta
const deleteComment = async (req, res) => {
  try {
    const userId = req.user.userId;
    const r = await query(
      `SELECT c.id, c.user_id, p.user_id AS post_author
       FROM user_post_comments c JOIN user_posts p ON p.id = c.post_id WHERE c.id = $1`,
      [req.params.id]
    );
    const c = r.rows[0];
    if (!c) return res.status(404).json({ error: { message: 'Komentarz nie został znaleziony', status: 404 } });
    if (c.user_id !== userId && c.post_author !== userId) {
      return res.status(403).json({ error: { message: 'Brak uprawnień', status: 403 } });
    }
    await query('DELETE FROM user_post_comments WHERE id = $1', [c.id]);
    res.json({ ok: true });
  } catch (error) {
    console.error('Post comment delete error:', error);
    res.status(500).json({ error: { message: 'Nie udało się usunąć komentarza', status: 500 } });
  }
};

module.exports = {
  getPosts, createPost, updatePost, deletePost, reactPost,
  getComments, addComment, deleteComment,
};
