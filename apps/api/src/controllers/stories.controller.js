const { query } = require('../config/database');

const MAX_IMAGE_LEN = 2_000_000;
const MAX_VIDEO_LEN = 7_000_000;
const MAX_TEXT_LEN = 400;
const MAX_ACTIVE_PER_USER = 10;
const STORY_TTL_HOURS = 24;

const TEXT_COLORS = ['#ffffff', '#111827', '#fbbf24', '#f87171', '#34d399', '#60a5fa', '#f472b6', '#a78bfa'];
const TEXT_SIZES = ['sm', 'md', 'lg'];
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, Number(v) || 0));

// Sanityzacja nakładek edytora relacji (tekst/emoji/muzyka)
const sanitizeMeta = (meta) => {
  if (!meta || typeof meta !== 'object') return null;
  const out = {};
  if (Array.isArray(meta.texts)) {
    const texts = meta.texts.slice(0, 10).map((t) => ({
      content: String(t?.content || '').trim().slice(0, 150),
      x: clamp(t?.x, 0, 100),
      y: clamp(t?.y, 0, 100),
      color: TEXT_COLORS.includes(t?.color) ? t.color : '#ffffff',
      size: TEXT_SIZES.includes(t?.size) ? t.size : 'md',
    })).filter((t) => t.content);
    if (texts.length) out.texts = texts;
  }
  if (Array.isArray(meta.stickers)) {
    const stickers = meta.stickers.slice(0, 20).map((s) => ({
      emoji: String(s?.emoji || '').slice(0, 8),
      x: clamp(s?.x, 0, 100),
      y: clamp(s?.y, 0, 100),
      scale: clamp(s?.scale, 0.5, 3) || 1,
    })).filter((s) => s.emoji);
    if (stickers.length) out.stickers = stickers;
  }
  if (meta.music && typeof meta.music === 'object') {
    const title = String(meta.music.title || '').trim().slice(0, 120);
    const artist = String(meta.music.artist || '').trim().slice(0, 120);
    let url = String(meta.music.url || '').trim();
    const isLibTrack = /^\/story-music\/[a-z0-9-]+\.(wav|mp3|ogg)$/i.test(url);
    const isAudioData = /^data:audio\/(mpeg|mp3|mp4|m4a|x-m4a|wav|x-wav|ogg|webm|aac);base64,[A-Za-z0-9+/=\s]+$/.test(url);
    url = isLibTrack || (isAudioData && url.length <= 7 * 1024 * 1024) ? url : '';
    if (title || artist || url) out.music = { title, artist, url: url || undefined };
  }
  return Object.keys(out).length ? out : null;
};

const fullName = (r) => `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'Użytkownik';

const storyRow = (r) => ({
  id: String(r.id),
  authorId: String(r.user_id),
  authorName: fullName(r),
  authorAvatar: r.avatar_url || null,
  image: r.image || null,
  mediaType: r.media_type || (r.image ? 'image' : null),
  text: r.text || '',
  bgColor: r.bg_color || '#1B6B4A',
  meta: r.meta && typeof r.meta === 'object' ? r.meta : null,
  viewCount: r.view_count || 0,
  seenByMe: !!r.seen_by_me,
  createdAt: r.created_at,
  expiresAt: r.expires_at,
});

const STORY_SELECT = `
  SELECT s.id, s.user_id, s.image, s.media_type, s.text, s.bg_color, s.meta, s.expires_at, s.created_at,
         u.first_name, u.last_name, u.avatar_url,
         (SELECT COUNT(*)::int FROM story_views sv WHERE sv.story_id = s.id) AS view_count,
         EXISTS(SELECT 1 FROM story_views sv WHERE sv.story_id = s.id AND sv.user_id = $1) AS seen_by_me
  FROM stories s JOIN users u ON u.id = s.user_id
  WHERE s.expires_at > NOW()`;

// GET /api/stories — aktywne relacje wszystkich użytkowników
const getStories = async (req, res) => {
  try {
    const userId = req.user.userId;
    const r = await query(`${STORY_SELECT} ORDER BY s.created_at DESC LIMIT 300`, [userId]);
    res.json({ stories: r.rows.map(storyRow) });
  } catch (error) {
    console.error('Stories list error:', error);
    res.status(500).json({ error: { message: 'Nie udało się pobrać relacji', status: 500 } });
  }
};

// POST /api/stories {image?, mediaType?, text?, bgColor?, meta?}
const createStory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const rawMedia = typeof req.body?.image === 'string' ? req.body.image : '';
    const isImage = rawMedia.startsWith('data:image/');
    const isVideo = rawMedia.startsWith('data:video/');
    const image = isImage && rawMedia.length <= MAX_IMAGE_LEN ? rawMedia
      : isVideo && rawMedia.length <= MAX_VIDEO_LEN ? rawMedia
      : null;
    const mediaType = isVideo ? 'video' : image ? 'image' : null;
    const text = String(req.body?.text || '').trim().slice(0, MAX_TEXT_LEN);
    const bgColor = /^#[0-9a-fA-F]{6}$/.test(req.body?.bgColor || '') ? req.body.bgColor : '#1B6B4A';
    const meta = sanitizeMeta(req.body?.meta);
    if (!image && !text && !meta?.texts?.length) {
      return res.status(400).json({ error: { message: 'Relacja nie może być pusta — dodaj zdjęcie, film lub tekst', status: 400 } });
    }
    // Limit aktywnych relacji na użytkownika — usuwamy najstarsze
    const cnt = await query(
      'SELECT COUNT(*)::int AS c FROM stories WHERE user_id = $1 AND expires_at > NOW()', [userId]
    );
    if (cnt.rows[0].c >= MAX_ACTIVE_PER_USER) {
      await query(
        `DELETE FROM stories WHERE id IN (
           SELECT id FROM stories WHERE user_id = $1 AND expires_at > NOW()
           ORDER BY created_at ASC LIMIT $2
         )`,
        [userId, cnt.rows[0].c - MAX_ACTIVE_PER_USER + 1]
      );
    }
    const ins = await query(
      `INSERT INTO stories (user_id, image, media_type, text, bg_color, meta, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '${STORY_TTL_HOURS} hours') RETURNING id`,
      [userId, image, mediaType, text, bgColor, meta ? JSON.stringify(meta) : null]
    );
    const r = await query(`${STORY_SELECT} AND s.id = $2`, [userId, ins.rows[0].id]);
    res.status(201).json({ story: storyRow(r.rows[0]) });
  } catch (error) {
    console.error('Story create error:', error);
    res.status(500).json({ error: { message: 'Nie udało się dodać relacji', status: 500 } });
  }
};

// POST /api/stories/:id/view — oznacz jako obejrzaną
const viewStory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const s = await query('SELECT id, user_id FROM stories WHERE id = $1 AND expires_at > NOW()', [req.params.id]);
    if (s.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Relacja nie istnieje lub wygasła', status: 404 } });
    }
    await query(
      'INSERT INTO story_views (story_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [s.rows[0].id, userId]
    );
    res.json({ ok: true });
  } catch (error) {
    console.error('Story view error:', error);
    res.status(500).json({ error: { message: 'Nie udało się zapisać wyświetlenia', status: 500 } });
  }
};

// DELETE /api/stories/:id — autor
const deleteStory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const r = await query('DELETE FROM stories WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, userId]);
    if (r.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Relacja nie została znaleziona', status: 404 } });
    }
    res.json({ ok: true });
  } catch (error) {
    console.error('Story delete error:', error);
    res.status(500).json({ error: { message: 'Nie udało się usunąć relacji', status: 500 } });
  }
};

module.exports = { getStories, createStory, viewStory, deleteStory };
