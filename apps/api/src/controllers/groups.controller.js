const { query, pool } = require('../config/database');
const { notify } = require('./notifications.controller');
const {
  MAX_IMAGE_LEN,
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

const VALID_CATEGORIES = ['general', 'dogs', 'cats', 'health', 'training', 'nutrition', 'breeding', 'local', 'other'];
const VALID_PRIVACY = ['public', 'private'];
const VALID_POSTING = ['everyone', 'mods'];

const groupRow = (r) => ({
  id: String(r.id),
  name: r.name,
  description: r.description || '',
  category: r.category,
  privacy: r.privacy,
  coverUrl: r.cover_url || null,
  postApproval: !!r.post_approval,
  memberPosting: r.member_posting || 'everyone',
  memberComments: r.member_comments !== false,
  ownerId: String(r.owner_id),
  ownerName: r.owner_first_name !== undefined ? `${r.owner_first_name || ''} ${r.owner_last_name || ''}`.trim() : undefined,
  memberCount: r.member_count,
  postCount: r.post_count,
  pendingCount: r.pending_count,
  pendingPostCount: r.pending_post_count,
  myRole: r.my_role || null,
  myStatus: r.my_status || null,
  createdAt: r.created_at,
});

const memberRow = (r) => ({
  userId: String(r.user_id),
  name: fullName(r),
  avatarUrl: r.avatar_url || null,
  role: r.role,
  status: r.status,
  joinedAt: r.created_at,
});

const postRow = (r) => ({
  id: String(r.id),
  authorId: String(r.user_id),
  authorName: fullName(r),
  authorAvatar: r.avatar_url || null,
  content: r.content,
  images: Array.isArray(r.images) ? r.images : [],
  postType: r.post_type || 'text',
  video: r.video || null,
  music: r.music && typeof r.music === 'object' ? r.music : null,
  walk: walkFromRow(r),
  status: r.status || 'approved',
  pinned: !!r.pinned,
  reactionCounts: r.reaction_counts || {},
  totalReactions: r.total_reactions || 0,
  myReaction: r.my_reaction || null,
  commentCount: r.comment_count || 0,
  createdAt: r.created_at,
});

// ---- helpers ----
const getMembership = async (groupId, userId) => {
  const r = await query('SELECT role, status FROM group_members WHERE group_id = $1 AND user_id = $2', [groupId, userId]);
  return r.rows[0] || null;
};
const isMod = (m) => !!m && m.status === 'active' && (m.role === 'owner' || m.role === 'moderator');
const isMember = (m) => !!m && m.status === 'active';

const getGroupOr404 = async (id, res) => {
  const r = await query('SELECT * FROM pet_groups WHERE id = $1', [id]);
  if (r.rows.length === 0) {
    res.status(404).json({ error: { message: 'Grupa nie została znaleziona', status: 404 } });
    return null;
  }
  return r.rows[0];
};

const notifyMods = async (groupId, excludeUserId, type, title, body, link) => {
  const mods = await query(
    `SELECT user_id FROM group_members WHERE group_id = $1 AND status = 'active' AND role IN ('owner','moderator')`,
    [groupId]
  );
  for (const m of mods.rows) {
    if (m.user_id !== excludeUserId) await notify(m.user_id, type, title, body, link);
  }
};

// ============ GRUPY ============

// GET /api/groups?search=&filter=all|mine
const getGroups = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { search, filter } = req.query;
    const params = [userId];
    let sql = `
      SELECT g.*,
        (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id AND gm.status = 'active')::int AS member_count,
        (SELECT COUNT(*) FROM group_posts gp WHERE gp.group_id = g.id)::int AS post_count,
        m.role AS my_role, m.status AS my_status,
        ou.first_name AS owner_first_name, ou.last_name AS owner_last_name
      FROM pet_groups g
      JOIN users ou ON ou.id = g.owner_id
      LEFT JOIN group_members m ON m.group_id = g.id AND m.user_id = $1
      WHERE 1=1
    `;
    if (filter === 'mine') {
      sql += ` AND m.status = 'active'`;
    }
    if (search) {
      params.push(`%${String(search).slice(0, 80)}%`);
      sql += ` AND (g.name ILIKE $${params.length} OR g.description ILIKE $${params.length})`;
    }
    sql += ' ORDER BY member_count DESC, g.created_at DESC LIMIT 100';
    const result = await query(sql, params);
    res.json({ groups: result.rows.map(groupRow) });
  } catch (error) {
    console.error('Groups list error:', error);
    res.status(500).json({ error: { message: 'Nie udało się pobrać grup', status: 500 } });
  }
};

// POST /api/groups
const createGroup = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, description = '', category = 'general', privacy = 'public', coverUrl } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: { message: 'Nazwa grupy jest wymagana', status: 400 } });
    }
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: { message: 'Nieprawidłowa kategoria', status: 400 } });
    }
    if (!VALID_PRIVACY.includes(privacy)) {
      return res.status(400).json({ error: { message: 'Nieprawidłowy typ prywatności', status: 400 } });
    }
    const cover = typeof coverUrl === 'string' && coverUrl.startsWith('data:image/') ? coverUrl.slice(0, MAX_IMAGE_LEN) : null;
    const result = await query(
      `INSERT INTO pet_groups (name, description, category, privacy, cover_url, owner_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [String(name).trim().slice(0, 120), String(description).trim().slice(0, 2000), category, privacy, cover, userId]
    );
    const g = result.rows[0];
    await query(`INSERT INTO group_members (group_id, user_id, role, status) VALUES ($1, $2, 'owner', 'active')`, [g.id, userId]);
    res.status(201).json({
      group: groupRow({ ...g, member_count: 1, post_count: 0, my_role: 'owner', my_status: 'active' }),
    });
  } catch (error) {
    console.error('Group create error:', error);
    res.status(500).json({ error: { message: 'Nie udało się utworzyć grupy', status: 500 } });
  }
};

// GET /api/groups/:id
const getGroup = async (req, res) => {
  try {
    const userId = req.user.userId;
    const g = await getGroupOr404(req.params.id, res);
    if (!g) return;
    const membership = await getMembership(g.id, userId);
    const counts = await query(
      `SELECT
        (SELECT COUNT(*) FROM group_members WHERE group_id = $1 AND status = 'active')::int AS member_count,
        (SELECT COUNT(*) FROM group_posts WHERE group_id = $1 AND status = 'approved')::int AS post_count,
        (SELECT COUNT(*) FROM group_members WHERE group_id = $1 AND status = 'pending')::int AS pending_count,
        (SELECT COUNT(*) FROM group_posts WHERE group_id = $1 AND status = 'pending')::int AS pending_post_count`,
      [g.id]
    );
    const owner = await query('SELECT first_name, last_name FROM users WHERE id = $1', [g.owner_id]);
    const base = {
      ...g,
      ...counts.rows[0],
      my_role: membership?.role || null,
      my_status: membership?.status || null,
      owner_first_name: owner.rows[0]?.first_name,
      owner_last_name: owner.rows[0]?.last_name,
    };
    // Grupa prywatna: dla osób spoza niej pokazujemy tylko podstawowe info
    const limited = g.privacy === 'private' && !isMember(membership);
    res.json({ group: { ...groupRow(base), limited } });
  } catch (error) {
    console.error('Group get error:', error);
    res.status(500).json({ error: { message: 'Nie udało się pobrać grupy', status: 500 } });
  }
};

// PATCH /api/groups/:id — właściciel lub moderator
const updateGroup = async (req, res) => {
  try {
    const userId = req.user.userId;
    const g = await getGroupOr404(req.params.id, res);
    if (!g) return;
    const membership = await getMembership(g.id, userId);
    if (!isMod(membership)) {
      return res.status(403).json({ error: { message: 'Brak uprawnień do edycji grupy', status: 403 } });
    }
    const { name, description, category, privacy, coverUrl, postApproval, memberPosting, memberComments } = req.body || {};
    if (category !== undefined && !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: { message: 'Nieprawidłowa kategoria', status: 400 } });
    }
    if (privacy !== undefined && !VALID_PRIVACY.includes(privacy)) {
      return res.status(400).json({ error: { message: 'Nieprawidłowy typ prywatności', status: 400 } });
    }
    if (memberPosting !== undefined && !VALID_POSTING.includes(memberPosting)) {
      return res.status(400).json({ error: { message: 'Nieprawidłowe ustawienie publikowania', status: 400 } });
    }
    if (name !== undefined && !String(name).trim()) {
      return res.status(400).json({ error: { message: 'Nazwa nie może być pusta', status: 400 } });
    }
    // Zmianę moderacji może wykonać tylko właściciel
    if ((postApproval !== undefined || memberPosting !== undefined || memberComments !== undefined)
        && g.owner_id !== userId) {
      return res.status(403).json({ error: { message: 'Ustawienia moderacji może zmieniać tylko właściciel', status: 403 } });
    }
    const cover = coverUrl === undefined ? g.cover_url
      : (typeof coverUrl === 'string' && coverUrl.startsWith('data:image/') ? coverUrl.slice(0, MAX_IMAGE_LEN) : null);
    const result = await query(
      `UPDATE pet_groups SET
         name = $1, description = $2, category = $3, privacy = $4, cover_url = $5,
         post_approval = $6, member_posting = $7, member_comments = $8, updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 RETURNING *`,
      [
        name !== undefined ? String(name).trim().slice(0, 120) : g.name,
        description !== undefined ? String(description).trim().slice(0, 2000) : g.description,
        category !== undefined ? category : g.category,
        privacy !== undefined ? privacy : g.privacy,
        cover,
        postApproval !== undefined ? !!postApproval : g.post_approval,
        memberPosting !== undefined ? memberPosting : g.member_posting,
        memberComments !== undefined ? !!memberComments : g.member_comments,
        g.id,
      ]
    );
    res.json({ group: groupRow({ ...result.rows[0], my_role: membership.role, my_status: membership.status }) });
  } catch (error) {
    console.error('Group update error:', error);
    res.status(500).json({ error: { message: 'Nie udało się zaktualizować grupy', status: 500 } });
  }
};

// DELETE /api/groups/:id — tylko właściciel
const deleteGroup = async (req, res) => {
  try {
    const userId = req.user.userId;
    const g = await getGroupOr404(req.params.id, res);
    if (!g) return;
    if (g.owner_id !== userId) {
      return res.status(403).json({ error: { message: 'Tylko właściciel może usunąć grupę', status: 403 } });
    }
    await query('DELETE FROM pet_groups WHERE id = $1', [g.id]);
    res.json({ ok: true });
  } catch (error) {
    console.error('Group delete error:', error);
    res.status(500).json({ error: { message: 'Nie udało się usunąć grupy', status: 500 } });
  }
};

// ============ CZŁONKOWSTWO ============

// POST /api/groups/:id/join
const joinGroup = async (req, res) => {
  try {
    const userId = req.user.userId;
    const g = await getGroupOr404(req.params.id, res);
    if (!g) return;
    const membership = await getMembership(g.id, userId);
    if (membership?.status === 'active') {
      return res.json({ status: 'active', role: membership.role });
    }
    if (membership?.status === 'pending') {
      return res.json({ status: 'pending' });
    }
    if (g.privacy === 'private') {
      await query(
        `INSERT INTO group_members (group_id, user_id, role, status) VALUES ($1, $2, 'member', 'pending')
         ON CONFLICT (group_id, user_id) DO UPDATE SET status = 'pending'`,
        [g.id, userId]
      );
      const me = await query('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
      await notifyMods(
        g.id, userId, 'group_request',
        `Nowa prośba o dołączenie do „${g.name}"`,
        `${fullName(me.rows[0] || {})} chce dołączyć do grupy.`,
        `/dashboard/groups/${g.id}`
      );
      return res.json({ status: 'pending' });
    }
    await query(
      `INSERT INTO group_members (group_id, user_id, role, status) VALUES ($1, $2, 'member', 'active')
       ON CONFLICT (group_id, user_id) DO UPDATE SET status = 'active', role = 'member'`,
      [g.id, userId]
    );
    res.json({ status: 'active', role: 'member' });
  } catch (error) {
    console.error('Group join error:', error);
    res.status(500).json({ error: { message: 'Nie udało się dołączyć do grupy', status: 500 } });
  }
};

// DELETE /api/groups/:id/leave
const leaveGroup = async (req, res) => {
  try {
    const userId = req.user.userId;
    const g = await getGroupOr404(req.params.id, res);
    if (!g) return;
    if (g.owner_id === userId) {
      return res.status(400).json({ error: { message: 'Właściciel nie może opuścić grupy — usuń ją lub przekaż innemu', status: 400 } });
    }
    await query('DELETE FROM group_members WHERE group_id = $1 AND user_id = $2', [g.id, userId]);
    res.json({ ok: true });
  } catch (error) {
    console.error('Group leave error:', error);
    res.status(500).json({ error: { message: 'Nie udało się opuścić grupy', status: 500 } });
  }
};

// GET /api/groups/:id/members — członkowie (+ pending dla moderatorów)
const getMembers = async (req, res) => {
  try {
    const userId = req.user.userId;
    const g = await getGroupOr404(req.params.id, res);
    if (!g) return;
    const membership = await getMembership(g.id, userId);
    if (g.privacy === 'private' && !isMember(membership)) {
      return res.status(403).json({ error: { message: 'Lista członków jest widoczna tylko dla członków grupy', status: 403 } });
    }
    const members = await query(
      `SELECT gm.user_id, gm.role, gm.status, gm.created_at, u.first_name, u.last_name, u.avatar_url
       FROM group_members gm JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id = $1 AND gm.status = 'active'
       ORDER BY CASE gm.role WHEN 'owner' THEN 0 WHEN 'moderator' THEN 1 ELSE 2 END, gm.created_at`,
      [g.id]
    );
    let pending = [];
    if (isMod(membership)) {
      const pr = await query(
        `SELECT gm.user_id, gm.role, gm.status, gm.created_at, u.first_name, u.last_name, u.avatar_url
         FROM group_members gm JOIN users u ON u.id = gm.user_id
         WHERE gm.group_id = $1 AND gm.status = 'pending' ORDER BY gm.created_at`,
        [g.id]
      );
      pending = pr.rows.map(memberRow);
    }
    res.json({ members: members.rows.map(memberRow), pending });
  } catch (error) {
    console.error('Group members error:', error);
    res.status(500).json({ error: { message: 'Nie udało się pobrać członków', status: 500 } });
  }
};

// POST /api/groups/:id/members/:uid/approve — moderator+
const approveMember = async (req, res) => {
  try {
    const userId = req.user.userId;
    const g = await getGroupOr404(req.params.id, res);
    if (!g) return;
    const membership = await getMembership(g.id, userId);
    if (!isMod(membership)) {
      return res.status(403).json({ error: { message: 'Brak uprawnień', status: 403 } });
    }
    const target = parseInt(req.params.uid, 10);
    const r = await query(
      `UPDATE group_members SET status = 'active' WHERE group_id = $1 AND user_id = $2 AND status = 'pending' RETURNING user_id`,
      [g.id, target]
    );
    if (r.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Nie znaleziono prośby o dołączenie', status: 404 } });
    }
    await notify(target, 'group_approved', `Zaakceptowano Cię do grupy „${g.name}"`, null, `/dashboard/groups/${g.id}`);
    res.json({ ok: true });
  } catch (error) {
    console.error('Member approve error:', error);
    res.status(500).json({ error: { message: 'Nie udało się zaakceptować członka', status: 500 } });
  }
};

// DELETE /api/groups/:id/members/:uid — usunięcie członka / odrzucenie prośby (moderator+)
const removeMember = async (req, res) => {
  try {
    const userId = req.user.userId;
    const g = await getGroupOr404(req.params.id, res);
    if (!g) return;
    const membership = await getMembership(g.id, userId);
    if (!isMod(membership)) {
      return res.status(403).json({ error: { message: 'Brak uprawnień', status: 403 } });
    }
    const target = parseInt(req.params.uid, 10);
    if (target === g.owner_id) {
      return res.status(400).json({ error: { message: 'Nie można usunąć właściciela grupy', status: 400 } });
    }
    const targetM = await getMembership(g.id, target);
    if (!targetM) {
      return res.status(404).json({ error: { message: 'Użytkownik nie jest członkiem grupy', status: 404 } });
    }
    // Moderator może usuwać tylko zwykłych członków i prośby; owner może wszystkich poza sobą
    if (membership.role === 'moderator' && targetM.status === 'active' && targetM.role !== 'member') {
      return res.status(403).json({ error: { message: 'Moderator nie może usunąć innego moderatora', status: 403 } });
    }
    await query('DELETE FROM group_members WHERE group_id = $1 AND user_id = $2', [g.id, target]);
    res.json({ ok: true });
  } catch (error) {
    console.error('Member remove error:', error);
    res.status(500).json({ error: { message: 'Nie udało się usunąć członka', status: 500 } });
  }
};

// PATCH /api/groups/:id/members/:uid {role: member|moderator} — tylko właściciel
const setMemberRole = async (req, res) => {
  try {
    const userId = req.user.userId;
    const g = await getGroupOr404(req.params.id, res);
    if (!g) return;
    if (g.owner_id !== userId) {
      return res.status(403).json({ error: { message: 'Tylko właściciel może zmieniać role', status: 403 } });
    }
    const target = parseInt(req.params.uid, 10);
    const { role } = req.body || {};
    if (!['member', 'moderator'].includes(role)) {
      return res.status(400).json({ error: { message: 'Nieprawidłowa rola', status: 400 } });
    }
    if (target === g.owner_id) {
      return res.status(400).json({ error: { message: 'Nie można zmienić roli właściciela', status: 400 } });
    }
    const r = await query(
      `UPDATE group_members SET role = $1 WHERE group_id = $2 AND user_id = $3 AND status = 'active' RETURNING user_id`,
      [role, g.id, target]
    );
    if (r.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Nie znaleziono członka', status: 404 } });
    }
    if (role === 'moderator') {
      await notify(target, 'group_role', `Zostałeś moderatorem grupy „${g.name}"`, null, `/dashboard/groups/${g.id}`);
    }
    res.json({ ok: true });
  } catch (error) {
    console.error('Member role error:', error);
    res.status(500).json({ error: { message: 'Nie udało się zmienić roli', status: 500 } });
  }
};

// ============ POSTY W GRUPIE ============

const GROUP_POST_SELECT = `
  SELECT p.id, p.group_id, p.user_id, p.content, p.images, p.pinned, p.status,
         p.post_type, p.video, p.music, p.walk_id, p.created_at,
         u.first_name, u.last_name, u.avatar_url,${WALK_SELECT},
         (SELECT COALESCE(jsonb_object_agg(reaction, c), '{}'::jsonb)
            FROM (SELECT reaction, COUNT(*)::int AS c FROM group_post_reactions WHERE post_id = p.id GROUP BY reaction) rc
         ) AS reaction_counts,
         (SELECT COUNT(*)::int FROM group_post_reactions WHERE post_id = p.id) AS total_reactions,
         (SELECT reaction FROM group_post_reactions WHERE post_id = p.id AND user_id = $1) AS my_reaction,
         (SELECT COUNT(*)::int FROM group_post_comments WHERE post_id = p.id) AS comment_count
  FROM group_posts p JOIN users u ON u.id = p.user_id${WALK_JOIN}`;

const canViewPosts = (g, membership) => g.privacy === 'public' || isMember(membership);

// GET /api/groups/:id/posts — zatwierdzone + własne oczekujące
const getGroupPosts = async (req, res) => {
  try {
    const userId = req.user.userId;
    const g = await getGroupOr404(req.params.id, res);
    if (!g) return;
    const membership = await getMembership(g.id, userId);
    if (!canViewPosts(g, membership)) {
      return res.status(403).json({ error: { message: 'Posty są widoczne tylko dla członków grupy', status: 403 } });
    }
    const r = await query(
      `${GROUP_POST_SELECT}
       WHERE p.group_id = $2 AND (p.status = 'approved' OR (p.status = 'pending' AND p.user_id = $1))
       ORDER BY p.pinned DESC, p.created_at DESC LIMIT 200`,
      [userId, g.id]
    );
    res.json({ posts: r.rows.map(postRow) });
  } catch (error) {
    console.error('Group posts error:', error);
    res.status(500).json({ error: { message: 'Nie udało się pobrać postów', status: 500 } });
  }
};

// GET /api/groups/:id/pending-posts — poczekalnia (moderator+)
const getPendingPosts = async (req, res) => {
  try {
    const userId = req.user.userId;
    const g = await getGroupOr404(req.params.id, res);
    if (!g) return;
    const membership = await getMembership(g.id, userId);
    if (!isMod(membership)) {
      return res.status(403).json({ error: { message: 'Brak uprawnień', status: 403 } });
    }
    const r = await query(
      `${GROUP_POST_SELECT} WHERE p.group_id = $2 AND p.status = 'pending' ORDER BY p.created_at ASC LIMIT 100`,
      [userId, g.id]
    );
    res.json({ posts: r.rows.map(postRow) });
  } catch (error) {
    console.error('Pending posts error:', error);
    res.status(500).json({ error: { message: 'Nie udało się pobrać poczekalni', status: 500 } });
  }
};

// POST /api/groups/:id/posts
const createGroupPost = async (req, res) => {
  try {
    const userId = req.user.userId;
    const g = await getGroupOr404(req.params.id, res);
    if (!g) return;
    const membership = await getMembership(g.id, userId);
    if (!isMember(membership)) {
      return res.status(403).json({ error: { message: 'Tylko członkowie grupy mogą publikować', status: 403 } });
    }
    const mod = isMod(membership);
    if (g.member_posting === 'mods' && !mod) {
      return res.status(403).json({ error: { message: 'W tej grupie publikować mogą tylko moderatorzy', status: 403 } });
    }
    const content = String(req.body?.content || '').trim().slice(0, 5000);
    const images = sanitizeImages(req.body?.images);
    const video = sanitizeVideo(req.body?.video);
    const music = sanitizeMusic(req.body?.music);
    const walkIdRaw = req.body?.walkId;
    const walkId = walkIdRaw !== undefined && walkIdRaw !== null && walkIdRaw !== ''
      ? parseInt(walkIdRaw, 10) : null;

    if (walkId !== null) {
      if (!Number.isFinite(walkId)) {
        return res.status(400).json({ error: { message: 'Nieprawidłowy spacer', status: 400 } });
      }
      const w = await query('SELECT id FROM walks WHERE id = $1 AND user_id = $2', [walkId, userId]);
      if (w.rows.length === 0) {
        return res.status(404).json({ error: { message: 'Spacer nie został znaleziony', status: 404 } });
      }
    }

    const postType = video ? 'reel' : walkId !== null ? 'walk' : 'text';
    if (!content && images.length === 0 && !video && !music && walkId === null) {
      return res.status(400).json({ error: { message: 'Post nie może być pusty', status: 400 } });
    }
    // Posty moderatorów wchodzą od razu; członków — wg ustawienia poczekalni
    const status = g.post_approval && !mod ? 'pending' : 'approved';
    const ins = await query(
      `INSERT INTO group_posts (group_id, user_id, content, images, post_type, video, music, walk_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [g.id, userId, content, JSON.stringify(images), postType, video,
       music ? JSON.stringify(music) : null, walkId, status]
    );
    if (status === 'pending') {
      const me = await query('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
      await notifyMods(
        g.id, userId, 'group_post_pending',
        `Nowy post w poczekalni „${g.name}"`,
        `${fullName(me.rows[0] || {})} wysłał(a) post do zatwierdzenia.`,
        `/dashboard/groups/${g.id}?tab=poczekalnia`
      );
    }
    const r = await query(`${GROUP_POST_SELECT} WHERE p.id = $2`, [userId, ins.rows[0].id]);
    res.status(201).json({ post: postRow(r.rows[0]) });
  } catch (error) {
    console.error('Group post create error:', error);
    res.status(500).json({ error: { message: 'Nie udało się dodać posta', status: 500 } });
  }
};

// POST /api/groups/posts/:id/approve — moderator+
const approveGroupPost = async (req, res) => {
  try {
    const userId = req.user.userId;
    const p = await getGroupPostRow(req.params.id);
    if (!p) return res.status(404).json({ error: { message: 'Post nie został znaleziony', status: 404 } });
    const membership = await getMembership(p.group_id, userId);
    if (!isMod(membership)) {
      return res.status(403).json({ error: { message: 'Brak uprawnień', status: 403 } });
    }
    const r = await query(
      `UPDATE group_posts SET status = 'approved' WHERE id = $1 AND status = 'pending' RETURNING id`,
      [p.id]
    );
    if (r.rows.length === 0) {
      return res.status(400).json({ error: { message: 'Post nie oczekuje na zatwierdzenie', status: 400 } });
    }
    if (p.user_id !== userId) {
      const g = await query('SELECT name FROM pet_groups WHERE id = $1', [p.group_id]);
      await notify(
        p.user_id, 'group_post_approved',
        `Post zatwierdzony w grupie „${g.rows[0]?.name || ''}"`,
        null, `/dashboard/groups/${p.group_id}`
      );
    }
    res.json({ ok: true });
  } catch (error) {
    console.error('Post approve error:', error);
    res.status(500).json({ error: { message: 'Nie udało się zatwierdzić posta', status: 500 } });
  }
};

// POST /api/groups/posts/:id/reject — moderator+ (usuwa post z poczekalni)
const rejectGroupPost = async (req, res) => {
  try {
    const userId = req.user.userId;
    const p = await getGroupPostRow(req.params.id);
    if (!p) return res.status(404).json({ error: { message: 'Post nie został znaleziony', status: 404 } });
    const membership = await getMembership(p.group_id, userId);
    if (!isMod(membership)) {
      return res.status(403).json({ error: { message: 'Brak uprawnień', status: 403 } });
    }
    if (p.status !== 'pending') {
      return res.status(400).json({ error: { message: 'Post nie oczekuje na zatwierdzenie', status: 400 } });
    }
    await query('DELETE FROM group_posts WHERE id = $1', [p.id]);
    if (p.user_id !== userId) {
      const g = await query('SELECT name FROM pet_groups WHERE id = $1', [p.group_id]);
      await notify(
        p.user_id, 'group_post_rejected',
        `Post odrzucony w grupie „${g.rows[0]?.name || ''}"`,
        'Moderator nie zaakceptował Twojego posta.', `/dashboard/groups/${p.group_id}`
      );
    }
    res.json({ ok: true });
  } catch (error) {
    console.error('Post reject error:', error);
    res.status(500).json({ error: { message: 'Nie udało się odrzucić posta', status: 500 } });
  }
};

const getGroupPostRow = async (postId) => {
  const r = await query(
    'SELECT p.*, g.owner_id, g.privacy, g.member_comments FROM group_posts p JOIN pet_groups g ON g.id = p.group_id WHERE p.id = $1',
    [postId]
  );
  return r.rows[0] || null;
};

// PATCH /api/groups/posts/:id — autor
const updateGroupPost = async (req, res) => {
  try {
    const userId = req.user.userId;
    const p = await getGroupPostRow(req.params.id);
    if (!p) return res.status(404).json({ error: { message: 'Post nie został znaleziony', status: 404 } });
    if (p.user_id !== userId) {
      return res.status(403).json({ error: { message: 'Możesz edytować tylko własne posty', status: 403 } });
    }
    const content = req.body?.content !== undefined ? String(req.body.content).trim().slice(0, 5000) : p.content;
    const images = req.body?.images !== undefined ? sanitizeImages(req.body.images) : p.images;
    const music = req.body?.music !== undefined ? sanitizeMusic(req.body.music) : p.music;
    if (!content && (!Array.isArray(images) || images.length === 0) && !p.video && !p.walk_id && !music) {
      return res.status(400).json({ error: { message: 'Post nie może być pusty', status: 400 } });
    }
    await query(
      `UPDATE group_posts SET content = $1, images = $2, music = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
      [content, JSON.stringify(images), music ? JSON.stringify(music) : null, p.id]
    );
    const r = await query(`${GROUP_POST_SELECT} WHERE p.id = $2`, [userId, p.id]);
    res.json({ post: postRow(r.rows[0]) });
  } catch (error) {
    console.error('Group post update error:', error);
    res.status(500).json({ error: { message: 'Nie udało się zaktualizować posta', status: 500 } });
  }
};

// DELETE /api/groups/posts/:id — autor lub moderator grupy
const deleteGroupPost = async (req, res) => {
  try {
    const userId = req.user.userId;
    const p = await getGroupPostRow(req.params.id);
    if (!p) return res.status(404).json({ error: { message: 'Post nie został znaleziony', status: 404 } });
    const membership = await getMembership(p.group_id, userId);
    if (p.user_id !== userId && !isMod(membership)) {
      return res.status(403).json({ error: { message: 'Brak uprawnień', status: 403 } });
    }
    await query('DELETE FROM group_posts WHERE id = $1', [p.id]);
    res.json({ ok: true });
  } catch (error) {
    console.error('Group post delete error:', error);
    res.status(500).json({ error: { message: 'Nie udało się usunąć posta', status: 500 } });
  }
};

// POST /api/groups/posts/:id/pin — moderator+
const pinGroupPost = async (req, res) => {
  try {
    const userId = req.user.userId;
    const p = await getGroupPostRow(req.params.id);
    if (!p) return res.status(404).json({ error: { message: 'Post nie został znaleziony', status: 404 } });
    const membership = await getMembership(p.group_id, userId);
    if (!isMod(membership)) {
      return res.status(403).json({ error: { message: 'Tylko moderator może przypinać posty', status: 403 } });
    }
    await query('UPDATE group_posts SET pinned = NOT pinned WHERE id = $1', [p.id]);
    res.json({ ok: true });
  } catch (error) {
    console.error('Group post pin error:', error);
    res.status(500).json({ error: { message: 'Nie udało się przypiąć posta', status: 500 } });
  }
};

// POST /api/groups/posts/:id/react {reaction}
const reactGroupPost = async (req, res) => {
  try {
    const userId = req.user.userId;
    const p = await getGroupPostRow(req.params.id);
    if (!p) return res.status(404).json({ error: { message: 'Post nie został znaleziony', status: 404 } });
    const membership = await getMembership(p.group_id, userId);
    if (!isMember(membership)) {
      return res.status(403).json({ error: { message: 'Tylko członkowie mogą reagować', status: 403 } });
    }
    if (p.status === 'pending') {
      return res.status(403).json({ error: { message: 'Post oczekuje na zatwierdzenie', status: 403 } });
    }
    const reaction = req.body?.reaction;
    if (reaction !== null && !VALID_REACTIONS.includes(reaction)) {
      return res.status(400).json({ error: { message: 'Nieprawidłowa reakcja', status: 400 } });
    }
    const existing = await query('SELECT reaction FROM group_post_reactions WHERE post_id = $1 AND user_id = $2', [p.id, userId]);
    if (reaction === null || (existing.rows[0] && existing.rows[0].reaction === reaction)) {
      await query('DELETE FROM group_post_reactions WHERE post_id = $1 AND user_id = $2', [p.id, userId]);
    } else {
      await query(
        `INSERT INTO group_post_reactions (post_id, user_id, reaction) VALUES ($1, $2, $3)
         ON CONFLICT (post_id, user_id) DO UPDATE SET reaction = $3`,
        [p.id, userId, reaction]
      );
    }
    const r = await query(`${GROUP_POST_SELECT} WHERE p.id = $2`, [userId, p.id]);
    res.json({ post: postRow(r.rows[0]) });
  } catch (error) {
    console.error('Group post react error:', error);
    res.status(500).json({ error: { message: 'Nie udało się zapisać reakcji', status: 500 } });
  }
};

// GET /api/groups/posts/:id/comments
const getGroupPostComments = async (req, res) => {
  try {
    const userId = req.user.userId;
    const p = await getGroupPostRow(req.params.id);
    if (!p) return res.status(404).json({ error: { message: 'Post nie został znaleziony', status: 404 } });
    const membership = await getMembership(p.group_id, userId);
    if (p.privacy === 'private' && !isMember(membership)) {
      return res.status(403).json({ error: { message: 'Brak dostępu', status: 403 } });
    }
    const r = await query(
      `SELECT c.id, c.user_id, c.content, c.created_at, u.first_name, u.last_name, u.avatar_url
       FROM group_post_comments c JOIN users u ON u.id = c.user_id
       WHERE c.post_id = $1 ORDER BY c.created_at LIMIT 200`,
      [p.id]
    );
    res.json({ comments: r.rows.map(commentRow) });
  } catch (error) {
    console.error('Group comments error:', error);
    res.status(500).json({ error: { message: 'Nie udało się pobrać komentarzy', status: 500 } });
  }
};

// POST /api/groups/posts/:id/comments
const addGroupPostComment = async (req, res) => {
  try {
    const userId = req.user.userId;
    const p = await getGroupPostRow(req.params.id);
    if (!p) return res.status(404).json({ error: { message: 'Post nie został znaleziony', status: 404 } });
    const membership = await getMembership(p.group_id, userId);
    if (!isMember(membership)) {
      return res.status(403).json({ error: { message: 'Tylko członkowie mogą komentować', status: 403 } });
    }
    if (p.status === 'pending') {
      return res.status(403).json({ error: { message: 'Post oczekuje na zatwierdzenie', status: 403 } });
    }
    if (p.member_comments === false && !isMod(membership)) {
      return res.status(403).json({ error: { message: 'Komentowanie jest wyłączone w tej grupie', status: 403 } });
    }
    const content = String(req.body?.content || '').trim().slice(0, 2000);
    if (!content) {
      return res.status(400).json({ error: { message: 'Komentarz nie może być pusty', status: 400 } });
    }
    const ins = await query(
      'INSERT INTO group_post_comments (post_id, user_id, content) VALUES ($1, $2, $3) RETURNING id',
      [p.id, userId, content]
    );
    const r = await query(
      `SELECT c.id, c.user_id, c.content, c.created_at, u.first_name, u.last_name, u.avatar_url
       FROM group_post_comments c JOIN users u ON u.id = c.user_id WHERE c.id = $1`,
      [ins.rows[0].id]
    );
    res.status(201).json({ comment: commentRow(r.rows[0]) });
  } catch (error) {
    console.error('Group comment add error:', error);
    res.status(500).json({ error: { message: 'Nie udało się dodać komentarza', status: 500 } });
  }
};

// DELETE /api/groups/comments/:id — autor komentarza, autor posta lub moderator grupy
const deleteGroupPostComment = async (req, res) => {
  try {
    const userId = req.user.userId;
    const r = await query(
      `SELECT c.id, c.user_id, p.user_id AS post_author, p.group_id
       FROM group_post_comments c JOIN group_posts p ON p.id = c.post_id WHERE c.id = $1`,
      [req.params.id]
    );
    const c = r.rows[0];
    if (!c) return res.status(404).json({ error: { message: 'Komentarz nie został znaleziony', status: 404 } });
    const membership = await getMembership(c.group_id, userId);
    if (c.user_id !== userId && c.post_author !== userId && !isMod(membership)) {
      return res.status(403).json({ error: { message: 'Brak uprawnień', status: 403 } });
    }
    await query('DELETE FROM group_post_comments WHERE id = $1', [c.id]);
    res.json({ ok: true });
  } catch (error) {
    console.error('Group comment delete error:', error);
    res.status(500).json({ error: { message: 'Nie udało się usunąć komentarza', status: 500 } });
  }
};

// ============ WYDARZENIA ============

const eventRow = (r) => ({
  id: String(r.id),
  title: r.title,
  description: r.description || '',
  location: r.location || '',
  startsAt: r.starts_at,
  coverImage: r.cover_image || null,
  authorId: String(r.user_id),
  authorName: fullName(r),
  authorAvatar: r.avatar_url || null,
  goingCount: r.going_count || 0,
  interestedCount: r.interested_count || 0,
  myStatus: r.my_status || null,
  attendees: r.attendees || [],
  ticketsEnabled: !!r.tickets_enabled,
  ticketPrice: r.ticket_price !== null && r.ticket_price !== undefined ? Number(r.ticket_price) : null,
  ticketTotal: r.ticket_total || null,
  ticketsClaimed: r.tickets_claimed || 0,
  myTickets: r.my_tickets || 0,
  ticketInfo: r.ticket_info || '',
  createdAt: r.created_at,
});

const EVENT_SELECT = `
  SELECT e.*, u.first_name, u.last_name, u.avatar_url,
    (SELECT COUNT(*)::int FROM group_event_responses r WHERE r.event_id = e.id AND r.status = 'going') AS going_count,
    (SELECT COUNT(*)::int FROM group_event_responses r WHERE r.event_id = e.id AND r.status = 'interested') AS interested_count,
    (SELECT r.status FROM group_event_responses r WHERE r.event_id = e.id AND r.user_id = $1) AS my_status,
    (SELECT json_agg(a) FROM (
       SELECT u2.first_name, u2.last_name, u2.avatar_url FROM group_event_responses r2
       JOIN users u2 ON u2.id = r2.user_id
       WHERE r2.event_id = e.id AND r2.status = 'going' ORDER BY r2.created_at LIMIT 8
     ) a) AS attendees,
    (SELECT COALESCE(SUM(quantity), 0)::int FROM group_event_tickets t WHERE t.event_id = e.id) AS tickets_claimed,
    (SELECT COALESCE(quantity, 0)::int FROM group_event_tickets t WHERE t.event_id = e.id AND t.user_id = $1) AS my_tickets
  FROM group_events e JOIN users u ON u.id = e.user_id`;

// GET /api/groups/:id/events
const getEvents = async (req, res) => {
  try {
    const userId = req.user.userId;
    const g = await getGroupOr404(req.params.id, res);
    if (!g) return;
    const membership = await getMembership(g.id, userId);
    if (!canViewPosts(g, membership)) {
      return res.status(403).json({ error: { message: 'Treść widoczna tylko dla członków grupy', status: 403 } });
    }
    const r = await query(`${EVENT_SELECT} WHERE e.group_id = $2 ORDER BY e.starts_at ASC LIMIT 100`, [userId, g.id]);
    res.json({ events: r.rows.map(eventRow) });
  } catch (error) {
    console.error('Events list error:', error);
    res.status(500).json({ error: { message: 'Nie udało się pobrać wydarzeń', status: 500 } });
  }
};

// POST /api/groups/:id/events — członek grupy
const createEvent = async (req, res) => {
  try {
    const userId = req.user.userId;
    const g = await getGroupOr404(req.params.id, res);
    if (!g) return;
    const membership = await getMembership(g.id, userId);
    if (!isMember(membership)) {
      return res.status(403).json({ error: { message: 'Tylko członkowie mogą tworzyć wydarzenia', status: 403 } });
    }
    const title = String(req.body?.title || '').trim().slice(0, 140);
    const description = String(req.body?.description || '').trim().slice(0, 3000);
    const location = String(req.body?.location || '').trim().slice(0, 200);
    const startsAt = req.body?.startsAt ? new Date(req.body.startsAt) : null;
    const coverImage = req.body?.coverImage ? String(req.body.coverImage).slice(0, MAX_IMAGE_LEN) : null;
    if (!title || !startsAt || isNaN(startsAt.getTime())) {
      return res.status(400).json({ error: { message: 'Podaj nazwę i datę wydarzenia', status: 400 } });
    }
    // Bilety (opcjonalne)
    const ticketsEnabled = !!req.body?.ticketsEnabled;
    let ticketTotal = null;
    let ticketPrice = null;
    const ticketInfo = String(req.body?.ticketInfo || '').trim().slice(0, 500);
    if (ticketsEnabled) {
      ticketTotal = parseInt(req.body?.ticketTotal, 10);
      if (!Number.isFinite(ticketTotal) || ticketTotal < 1 || ticketTotal > 10000) {
        return res.status(400).json({ error: { message: 'Podaj liczbę biletów (1–10000)', status: 400 } });
      }
      const p = parseFloat(req.body?.ticketPrice);
      if (req.body?.ticketPrice !== undefined && req.body?.ticketPrice !== null && req.body?.ticketPrice !== '') {
        if (!Number.isFinite(p) || p < 0 || p > 100000) {
          return res.status(400).json({ error: { message: 'Nieprawidłowa cena biletu', status: 400 } });
        }
        ticketPrice = Math.round(p * 100) / 100;
      }
    }
    const ins = await query(
      `INSERT INTO group_events (group_id, user_id, title, description, location, starts_at, cover_image, tickets_enabled, ticket_price, ticket_total, ticket_info)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [g.id, userId, title, description, location, startsAt, coverImage, ticketsEnabled, ticketPrice, ticketTotal, ticketInfo]
    );
    // organizator automatycznie bierze udział
    await query(
      `INSERT INTO group_event_responses (event_id, user_id, status) VALUES ($1, $2, 'going') ON CONFLICT DO NOTHING`,
      [ins.rows[0].id, userId]
    );
    // powiadom członków grupy (bez twórcy)
    const me = await query('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
    const members = await query(
      `SELECT user_id FROM group_members WHERE group_id = $1 AND status = 'active' AND user_id <> $2 LIMIT 300`,
      [g.id, userId]
    );
    for (const m of members.rows) {
      await notify(
        m.user_id, 'group_event', `Wydarzenie w grupie „${g.name}"`,
        `${fullName(me.rows[0] || {})}: ${title}`,
        `/dashboard/groups/${g.id}?tab=wydarzenia`
      );
    }
    const r = await query(`${EVENT_SELECT} WHERE e.id = $2`, [userId, ins.rows[0].id]);
    res.status(201).json({ event: eventRow(r.rows[0]) });
  } catch (error) {
    console.error('Event create error:', error);
    res.status(500).json({ error: { message: 'Nie udało się utworzyć wydarzenia', status: 500 } });
  }
};

// POST /api/groups/events/:id/respond {status: going|interested|not_going|null}
const respondEvent = async (req, res) => {
  try {
    const userId = req.user.userId;
    const ev = await query('SELECT * FROM group_events WHERE id = $1', [req.params.id]);
    const e = ev.rows[0];
    if (!e) return res.status(404).json({ error: { message: 'Wydarzenie nie istnieje', status: 404 } });
    const membership = await getMembership(e.group_id, userId);
    if (!isMember(membership)) {
      return res.status(403).json({ error: { message: 'Tylko członkowie mogą odpowiadać na wydarzenia', status: 403 } });
    }
    const status = req.body?.status;
    if (status === null || status === undefined) {
      await query('DELETE FROM group_event_responses WHERE event_id = $1 AND user_id = $2', [e.id, userId]);
    } else {
      if (!['going', 'interested', 'not_going'].includes(status)) {
        return res.status(400).json({ error: { message: 'Nieprawidłowa odpowiedź', status: 400 } });
      }
      await query(
        `INSERT INTO group_event_responses (event_id, user_id, status) VALUES ($1, $2, $3)
         ON CONFLICT (event_id, user_id) DO UPDATE SET status = $3`,
        [e.id, userId, status]
      );
    }
    const r = await query(`${EVENT_SELECT} WHERE e.id = $2`, [userId, e.id]);
    res.json({ event: eventRow(r.rows[0]) });
  } catch (error) {
    console.error('Event respond error:', error);
    res.status(500).json({ error: { message: 'Nie udało się zapisać odpowiedzi', status: 500 } });
  }
};

// POST /api/groups/events/:id/tickets {quantity 1..5} — rezerwacja biletu
const claimTicket = async (req, res) => {
  try {
    const userId = req.user.userId;
    const ev = await query('SELECT * FROM group_events WHERE id = $1', [req.params.id]);
    const e = ev.rows[0];
    if (!e || !e.tickets_enabled) {
      return res.status(404).json({ error: { message: 'To wydarzenie nie ma biletów', status: 404 } });
    }
    const membership = await getMembership(e.group_id, userId);
    if (!isMember(membership)) {
      return res.status(403).json({ error: { message: 'Tylko członkowie mogą rezerwować bilety', status: 403 } });
    }
    if (new Date(e.starts_at).getTime() < Date.now()) {
      return res.status(400).json({ error: { message: 'Wydarzenie już się odbyło', status: 400 } });
    }
    const qty = parseInt(req.body?.quantity, 10);
    if (!Number.isFinite(qty) || qty < 1 || qty > 5) {
      return res.status(400).json({ error: { message: 'Możesz zarezerwować 1–5 biletów', status: 400 } });
    }
    // Transakcja + blokada wiersza wydarzenia — dwie równoczesne rezerwacje nie przekroczą puli
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT id FROM group_events WHERE id = $1 FOR UPDATE', [e.id]);
      const claimed = await client.query(
        'SELECT COALESCE(SUM(quantity),0)::int AS c FROM group_event_tickets WHERE event_id = $1',
        [e.id]
      );
      if (claimed.rows[0].c + qty > e.ticket_total) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: { message: 'Brak wystarczającej liczby biletów w puli', status: 409 } });
      }
      await client.query(
        `INSERT INTO group_event_tickets (event_id, user_id, quantity) VALUES ($1, $2, $3)
         ON CONFLICT (event_id, user_id) DO UPDATE SET quantity = group_event_tickets.quantity + EXCLUDED.quantity`,
        [e.id, userId, qty]
      );
      // Rezerwacja biletu = chęć udziału
      await client.query(
        `INSERT INTO group_event_responses (event_id, user_id, status) VALUES ($1, $2, 'going')
         ON CONFLICT (event_id, user_id) DO UPDATE SET status = 'going'`,
        [e.id, userId]
      );
      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK').catch(() => {});
      throw txErr;
    } finally {
      client.release();
    }
    const r = await query(`${EVENT_SELECT} WHERE e.id = $2`, [userId, e.id]);
    res.json({ event: eventRow(r.rows[0]) });
  } catch (error) {
    console.error('Ticket claim error:', error);
    res.status(500).json({ error: { message: 'Nie udało się zarezerwować biletu', status: 500 } });
  }
};

// DELETE /api/groups/events/:id/tickets — zwrot biletu
const unclaimTicket = async (req, res) => {
  try {
    const userId = req.user.userId;
    const ev = await query('SELECT * FROM group_events WHERE id = $1', [req.params.id]);
    const e = ev.rows[0];
    if (!e) return res.status(404).json({ error: { message: 'Wydarzenie nie istnieje', status: 404 } });
    const membership = await getMembership(e.group_id, userId);
    if (!isMember(membership)) {
      return res.status(403).json({ error: { message: 'Brak uprawnień', status: 403 } });
    }
    await query('DELETE FROM group_event_tickets WHERE event_id = $1 AND user_id = $2', [e.id, userId]);
    const r = await query(`${EVENT_SELECT} WHERE e.id = $2`, [userId, e.id]);
    res.json({ event: eventRow(r.rows[0]) });
  } catch (error) {
    console.error('Ticket unclaim error:', error);
    res.status(500).json({ error: { message: 'Nie udało się oddać biletu', status: 500 } });
  }
};

// DELETE /api/groups/events/:id — twórca lub moderator
const deleteEvent = async (req, res) => {
  try {
    const userId = req.user.userId;
    const ev = await query('SELECT * FROM group_events WHERE id = $1', [req.params.id]);
    const e = ev.rows[0];
    if (!e) return res.status(404).json({ error: { message: 'Wydarzenie nie istnieje', status: 404 } });
    const membership = await getMembership(e.group_id, userId);
    if (e.user_id !== userId && !isMod(membership)) {
      return res.status(403).json({ error: { message: 'Brak uprawnień', status: 403 } });
    }
    await query('DELETE FROM group_events WHERE id = $1', [e.id]);
    res.json({ ok: true });
  } catch (error) {
    console.error('Event delete error:', error);
    res.status(500).json({ error: { message: 'Nie udało się usunąć wydarzenia', status: 500 } });
  }
};

// ============ ANKIETY ============

const pollRow = (r) => {
  const options = Array.isArray(r.options) ? r.options : [];
  const counts = r.vote_counts || {};
  const total = Object.values(counts).reduce((s, v) => s + Number(v || 0), 0);
  return {
    id: String(r.id),
    question: r.question,
    options: options.map((text, i) => ({ text, votes: Number(counts[String(i)] || 0) })),
    totalVotes: total,
    myVote: r.my_vote !== null && r.my_vote !== undefined ? Number(r.my_vote) : null,
    authorId: String(r.user_id),
    authorName: fullName(r),
    authorAvatar: r.avatar_url || null,
    endsAt: r.ends_at,
    createdAt: r.created_at,
  };
};

const POLL_SELECT = `
  SELECT pl.*, u.first_name, u.last_name, u.avatar_url,
    (SELECT json_object_agg(v.option_index::text, cnt) FROM (
       SELECT option_index, COUNT(*)::int AS cnt FROM group_poll_votes WHERE poll_id = pl.id GROUP BY option_index
     ) v) AS vote_counts,
    (SELECT v2.option_index FROM group_poll_votes v2 WHERE v2.poll_id = pl.id AND v2.user_id = $1) AS my_vote
  FROM group_polls pl JOIN users u ON u.id = pl.user_id`;

// GET /api/groups/:id/polls
const getPolls = async (req, res) => {
  try {
    const userId = req.user.userId;
    const g = await getGroupOr404(req.params.id, res);
    if (!g) return;
    const membership = await getMembership(g.id, userId);
    if (!canViewPosts(g, membership)) {
      return res.status(403).json({ error: { message: 'Treść widoczna tylko dla członków grupy', status: 403 } });
    }
    const r = await query(`${POLL_SELECT} WHERE pl.group_id = $2 ORDER BY pl.created_at DESC LIMIT 100`, [userId, g.id]);
    res.json({ polls: r.rows.map(pollRow) });
  } catch (error) {
    console.error('Polls list error:', error);
    res.status(500).json({ error: { message: 'Nie udało się pobrać ankiet', status: 500 } });
  }
};

// POST /api/groups/:id/polls {question, options[], endsAt?}
const createPoll = async (req, res) => {
  try {
    const userId = req.user.userId;
    const g = await getGroupOr404(req.params.id, res);
    if (!g) return;
    const membership = await getMembership(g.id, userId);
    if (!isMember(membership)) {
      return res.status(403).json({ error: { message: 'Tylko członkowie mogą tworzyć ankiety', status: 403 } });
    }
    const question = String(req.body?.question || '').trim().slice(0, 200);
    const options = (Array.isArray(req.body?.options) ? req.body.options : [])
      .map((o) => String(o || '').trim().slice(0, 120))
      .filter(Boolean)
      .slice(0, 6);
    const endsAt = req.body?.endsAt ? new Date(req.body.endsAt) : null;
    if (!question || options.length < 2) {
      return res.status(400).json({ error: { message: 'Podaj pytanie i co najmniej 2 odpowiedzi', status: 400 } });
    }
    const ins = await query(
      `INSERT INTO group_polls (group_id, user_id, question, options, ends_at) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [g.id, userId, question, JSON.stringify(options), endsAt && !isNaN(endsAt.getTime()) ? endsAt : null]
    );
    const r = await query(`${POLL_SELECT} WHERE pl.id = $2`, [userId, ins.rows[0].id]);
    res.status(201).json({ poll: pollRow(r.rows[0]) });
  } catch (error) {
    console.error('Poll create error:', error);
    res.status(500).json({ error: { message: 'Nie udało się utworzyć ankiety', status: 500 } });
  }
};

// POST /api/groups/polls/:id/vote {optionIndex} — 1 głos, można zmienić
const votePoll = async (req, res) => {
  try {
    const userId = req.user.userId;
    const pl = await query('SELECT * FROM group_polls WHERE id = $1', [req.params.id]);
    const p = pl.rows[0];
    if (!p) return res.status(404).json({ error: { message: 'Ankieta nie istnieje', status: 404 } });
    const membership = await getMembership(p.group_id, userId);
    if (!isMember(membership)) {
      return res.status(403).json({ error: { message: 'Tylko członkowie mogą głosować', status: 403 } });
    }
    if (p.ends_at && new Date(p.ends_at) < new Date()) {
      return res.status(400).json({ error: { message: 'Ankieta jest zakończona', status: 400 } });
    }
    const options = Array.isArray(p.options) ? p.options : [];
    const idx = parseInt(req.body?.optionIndex, 10);
    if (!Number.isInteger(idx) || idx < 0 || idx >= options.length) {
      return res.status(400).json({ error: { message: 'Nieprawidłowa opcja', status: 400 } });
    }
    await query(
      `INSERT INTO group_poll_votes (poll_id, user_id, option_index) VALUES ($1, $2, $3)
       ON CONFLICT (poll_id, user_id) DO UPDATE SET option_index = $3, created_at = NOW()`,
      [p.id, userId, idx]
    );
    const r = await query(`${POLL_SELECT} WHERE pl.id = $2`, [userId, p.id]);
    res.json({ poll: pollRow(r.rows[0]) });
  } catch (error) {
    console.error('Poll vote error:', error);
    res.status(500).json({ error: { message: 'Nie udało się oddać głosu', status: 500 } });
  }
};

// DELETE /api/groups/polls/:id — twórca lub moderator
const deletePoll = async (req, res) => {
  try {
    const userId = req.user.userId;
    const pl = await query('SELECT * FROM group_polls WHERE id = $1', [req.params.id]);
    const p = pl.rows[0];
    if (!p) return res.status(404).json({ error: { message: 'Ankieta nie istnieje', status: 404 } });
    const membership = await getMembership(p.group_id, userId);
    if (p.user_id !== userId && !isMod(membership)) {
      return res.status(403).json({ error: { message: 'Brak uprawnień', status: 403 } });
    }
    await query('DELETE FROM group_polls WHERE id = $1', [p.id]);
    res.json({ ok: true });
  } catch (error) {
    console.error('Poll delete error:', error);
    res.status(500).json({ error: { message: 'Nie udało się usunąć ankiety', status: 500 } });
  }
};

// ============ KONKURSY ============

const contestRow = (r) => ({
  id: String(r.id),
  title: r.title,
  description: r.description || '',
  endsAt: r.ends_at,
  status: r.status,
  winnerUserId: r.winner_user_id ? String(r.winner_user_id) : null,
  winnerName: r.winner_first_name !== undefined
    ? `${r.winner_first_name || ''} ${r.winner_last_name || ''}`.trim() || null
    : null,
  authorId: String(r.user_id),
  authorName: fullName(r),
  entryCount: r.entry_count || 0,
  myEntry: !!r.my_entry,
  createdAt: r.created_at,
});

const CONTEST_SELECT = `
  SELECT c.*, u.first_name, u.last_name,
    wu.first_name AS winner_first_name, wu.last_name AS winner_last_name,
    (SELECT COUNT(*)::int FROM group_contest_entries e WHERE e.contest_id = c.id) AS entry_count,
    EXISTS(SELECT 1 FROM group_contest_entries e WHERE e.contest_id = c.id AND e.user_id = $1) AS my_entry
  FROM group_contests c
  JOIN users u ON u.id = c.user_id
  LEFT JOIN users wu ON wu.id = c.winner_user_id`;

const entryRow = (r) => ({
  id: String(r.id),
  userId: String(r.user_id),
  name: fullName(r),
  avatarUrl: r.avatar_url || null,
  body: r.body || '',
  image: r.image || null,
  createdAt: r.created_at,
});

// GET /api/groups/:id/contests
const getContests = async (req, res) => {
  try {
    const userId = req.user.userId;
    const g = await getGroupOr404(req.params.id, res);
    if (!g) return;
    const membership = await getMembership(g.id, userId);
    if (!canViewPosts(g, membership)) {
      return res.status(403).json({ error: { message: 'Treść widoczna tylko dla członków grupy', status: 403 } });
    }
    const r = await query(`${CONTEST_SELECT} WHERE c.group_id = $2 ORDER BY c.status = 'open' DESC, c.ends_at ASC LIMIT 100`, [userId, g.id]);
    res.json({ contests: r.rows.map(contestRow) });
  } catch (error) {
    console.error('Contests list error:', error);
    res.status(500).json({ error: { message: 'Nie udało się pobrać konkursów', status: 500 } });
  }
};

// GET /api/groups/contests/:id — szczegóły ze zgłoszeniami
const getContest = async (req, res) => {
  try {
    const userId = req.user.userId;
    const cr = await query(`${CONTEST_SELECT} WHERE c.id = $2`, [userId, req.params.id]);
    const c = cr.rows[0];
    if (!c) return res.status(404).json({ error: { message: 'Konkurs nie istnieje', status: 404 } });
    const membership = await getMembership(c.group_id, userId);
    const g = await query('SELECT privacy FROM pet_groups WHERE id = $1', [c.group_id]);
    if (g.rows[0]?.privacy === 'private' && !isMember(membership)) {
      return res.status(403).json({ error: { message: 'Brak dostępu', status: 403 } });
    }
    const entries = await query(
      `SELECT e.*, u.first_name, u.last_name, u.avatar_url
       FROM group_contest_entries e JOIN users u ON u.id = e.user_id
       WHERE e.contest_id = $1 ORDER BY e.created_at ASC LIMIT 200`,
      [c.id]
    );
    res.json({ contest: contestRow(c), entries: entries.rows.map(entryRow) });
  } catch (error) {
    console.error('Contest detail error:', error);
    res.status(500).json({ error: { message: 'Nie udało się pobrać konkursu', status: 500 } });
  }
};

// POST /api/groups/:id/contests — tylko moderatorzy
const createContest = async (req, res) => {
  try {
    const userId = req.user.userId;
    const g = await getGroupOr404(req.params.id, res);
    if (!g) return;
    const membership = await getMembership(g.id, userId);
    if (!isMod(membership)) {
      return res.status(403).json({ error: { message: 'Konkursy mogą tworzyć tylko moderatorzy', status: 403 } });
    }
    const title = String(req.body?.title || '').trim().slice(0, 140);
    const description = String(req.body?.description || '').trim().slice(0, 3000);
    const endsAt = req.body?.endsAt ? new Date(req.body.endsAt) : null;
    if (!title || !endsAt || isNaN(endsAt.getTime())) {
      return res.status(400).json({ error: { message: 'Podaj nazwę i datę zakończenia konkursu', status: 400 } });
    }
    const ins = await query(
      `INSERT INTO group_contests (group_id, user_id, title, description, ends_at) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [g.id, userId, title, description, endsAt]
    );
    // powiadom członków o konkursie
    const members = await query(
      `SELECT user_id FROM group_members WHERE group_id = $1 AND status = 'active' AND user_id <> $2 LIMIT 300`,
      [g.id, userId]
    );
    for (const m of members.rows) {
      await notify(
        m.user_id, 'group_contest', `Nowy konkurs w grupie „${g.name}"`,
        title, `/dashboard/groups/${g.id}?tab=konkursy`
      );
    }
    const r = await query(`${CONTEST_SELECT} WHERE c.id = $2`, [userId, ins.rows[0].id]);
    res.status(201).json({ contest: contestRow(r.rows[0]) });
  } catch (error) {
    console.error('Contest create error:', error);
    res.status(500).json({ error: { message: 'Nie udało się utworzyć konkursu', status: 500 } });
  }
};

// POST /api/groups/contests/:id/entries {body, image} — zgłoszenie (1 na użytkownika)
const addContestEntry = async (req, res) => {
  try {
    const userId = req.user.userId;
    const cr = await query('SELECT * FROM group_contests WHERE id = $1', [req.params.id]);
    const c = cr.rows[0];
    if (!c) return res.status(404).json({ error: { message: 'Konkurs nie istnieje', status: 404 } });
    const membership = await getMembership(c.group_id, userId);
    if (!isMember(membership)) {
      return res.status(403).json({ error: { message: 'Tylko członkowie mogą się zgłaszać', status: 403 } });
    }
    if (c.status !== 'open' || new Date(c.ends_at) < new Date()) {
      return res.status(400).json({ error: { message: 'Konkurs jest zakończony', status: 400 } });
    }
    const body = String(req.body?.body || '').trim().slice(0, 2000);
    const image = req.body?.image ? String(req.body.image).slice(0, MAX_IMAGE_LEN) : null;
    if (!body && !image) {
      return res.status(400).json({ error: { message: 'Dodaj treść lub zdjęcie zgłoszenia', status: 400 } });
    }
    const ins = await query(
      `INSERT INTO group_contest_entries (contest_id, user_id, body, image) VALUES ($1, $2, $3, $4)
       ON CONFLICT (contest_id, user_id) DO UPDATE SET body = $3, image = $4 RETURNING id`,
      [c.id, userId, body, image]
    );
    // powiadom twórcę konkursu
    if (c.user_id !== userId) {
      const me = await query('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
      notify(c.user_id, 'group_contest_entry', 'Nowe zgłoszenie w konkursie', `${fullName(me.rows[0] || {})} wziął(a) udział w „${c.title}".`, `/dashboard/groups/${c.group_id}?tab=konkursy`);
    }
    const r = await query(
      `SELECT e.*, u.first_name, u.last_name, u.avatar_url FROM group_contest_entries e JOIN users u ON u.id = e.user_id WHERE e.id = $1`,
      [ins.rows[0].id]
    );
    res.status(201).json({ entry: entryRow(r.rows[0]) });
  } catch (error) {
    console.error('Contest entry error:', error);
    res.status(500).json({ error: { message: 'Nie udało się dodać zgłoszenia', status: 500 } });
  }
};

// DELETE /api/groups/contests/entries/:id — autor zgłoszenia lub moderator
const deleteContestEntry = async (req, res) => {
  try {
    const userId = req.user.userId;
    const er = await query(
      `SELECT e.*, c.group_id, c.status FROM group_contest_entries e JOIN group_contests c ON c.id = e.contest_id WHERE e.id = $1`,
      [req.params.id]
    );
    const en = er.rows[0];
    if (!en) return res.status(404).json({ error: { message: 'Zgłoszenie nie istnieje', status: 404 } });
    const membership = await getMembership(en.group_id, userId);
    if (en.user_id !== userId && !isMod(membership)) {
      return res.status(403).json({ error: { message: 'Brak uprawnień', status: 403 } });
    }
    await query('DELETE FROM group_contest_entries WHERE id = $1', [en.id]);
    res.json({ ok: true });
  } catch (error) {
    console.error('Contest entry delete error:', error);
    res.status(500).json({ error: { message: 'Nie udało się usunąć zgłoszenia', status: 500 } });
  }
};

// POST /api/groups/contests/:id/winner {userId} — moderator wybiera zwycięzcę
const pickContestWinner = async (req, res) => {
  try {
    const userId = req.user.userId;
    const cr = await query('SELECT * FROM group_contests WHERE id = $1', [req.params.id]);
    const c = cr.rows[0];
    if (!c) return res.status(404).json({ error: { message: 'Konkurs nie istnieje', status: 404 } });
    const membership = await getMembership(c.group_id, userId);
    if (!isMod(membership)) {
      return res.status(403).json({ error: { message: 'Tylko moderator może wybierać zwycięzcę', status: 403 } });
    }
    const winnerId = parseInt(req.body?.userId, 10);
    const entry = await query(
      'SELECT e.id, u.first_name, u.last_name FROM group_contest_entries e JOIN users u ON u.id = e.user_id WHERE e.contest_id = $1 AND e.user_id = $2',
      [c.id, winnerId]
    );
    if (!entry.rows[0]) {
      return res.status(400).json({ error: { message: 'Zwycięzca musi mieć zgłoszenie w tym konkursie', status: 400 } });
    }
    await query(
      `UPDATE group_contests SET winner_user_id = $1, status = 'ended' WHERE id = $2`,
      [winnerId, c.id]
    );
    // powiadom zwycięzcę i uczestników
    const participants = await query(
      'SELECT user_id FROM group_contest_entries WHERE contest_id = $1 AND user_id <> $2',
      [c.id, winnerId]
    );
    const wName = fullName(entry.rows[0]);
    await notify(winnerId, 'group_contest_win', `Wygrałeś(aś) konkurs!`, `„${c.title}" — gratulacje!`, `/dashboard/groups/${c.group_id}?tab=konkursy`);
    for (const p of participants.rows) {
      await notify(p.user_id, 'group_contest_win', 'Konkurs rozstrzygnięty', `„${c.title}" — wygrał(a) ${wName}.`, `/dashboard/groups/${c.group_id}?tab=konkursy`);
    }
    const r = await query(`${CONTEST_SELECT} WHERE c.id = $2`, [userId, c.id]);
    res.json({ contest: contestRow(r.rows[0]) });
  } catch (error) {
    console.error('Contest winner error:', error);
    res.status(500).json({ error: { message: 'Nie udało się wybrać zwycięzcy', status: 500 } });
  }
};

// DELETE /api/groups/contests/:id — twórca lub moderator
const deleteContest = async (req, res) => {
  try {
    const userId = req.user.userId;
    const cr = await query('SELECT * FROM group_contests WHERE id = $1', [req.params.id]);
    const c = cr.rows[0];
    if (!c) return res.status(404).json({ error: { message: 'Konkurs nie istnieje', status: 404 } });
    const membership = await getMembership(c.group_id, userId);
    if (c.user_id !== userId && !isMod(membership)) {
      return res.status(403).json({ error: { message: 'Brak uprawnień', status: 403 } });
    }
    await query('DELETE FROM group_contests WHERE id = $1', [c.id]);
    res.json({ ok: true });
  } catch (error) {
    console.error('Contest delete error:', error);
    res.status(500).json({ error: { message: 'Nie udało się usunąć konkursu', status: 500 } });
  }
};

module.exports = {
  getGroups, createGroup, getGroup, updateGroup, deleteGroup,
  joinGroup, leaveGroup, getMembers, approveMember, removeMember, setMemberRole,
  getGroupPosts, getPendingPosts, createGroupPost, approveGroupPost, rejectGroupPost,
  updateGroupPost, deleteGroupPost, pinGroupPost, reactGroupPost,
  getGroupPostComments, addGroupPostComment, deleteGroupPostComment,
  getEvents, createEvent, respondEvent, deleteEvent, claimTicket, unclaimTicket,
  getPolls, createPoll, votePoll, deletePoll,
  getContests, getContest, createContest, addContestEntry, deleteContestEntry,
  pickContestWinner, deleteContest,
};
