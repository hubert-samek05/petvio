const { query } = require('../config/database');
const { notify } = require('./notifications.controller');
const { fullName } = require('./social.helpers');

const personRow = (r) => ({
  id: String(r.id),
  name: fullName(r),
  avatarUrl: r.avatar_url || null,
});

// relacja miedzy mna a userId: none | friend | pending_out | pending_in
const relationOf = async (userId, otherId) => {
  const r = await query(
    `SELECT status, requester_id FROM friendships
     WHERE (requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1)`,
    [userId, otherId]
  );
  if (!r.rows[0]) return 'none';
  if (r.rows[0].status === 'accepted') return 'friend';
  return r.rows[0].requester_id === userId ? 'pending_out' : 'pending_in';
};

const isFollowing = async (userId, otherId) => {
  const r = await query('SELECT 1 FROM follows WHERE follower_id = $1 AND followee_id = $2', [userId, otherId]);
  return r.rows.length > 0;
};

// blokada w którąkolwiek stronę
const isBlockedEither = async (a, b) => {
  const r = await query(
    'SELECT 1 FROM user_blocks WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)',
    [a, b]
  );
  return r.rows.length > 0;
};

const areFriends = async (a, b) => (await relationOf(a, b)) === 'friend';

// czy `viewer` widzi pole wrażliwe wg ustawienia widoczności
const canSeePrivate = (visibility, relation, isSelf) =>
  isSelf || visibility === 'public' || (visibility === 'friends' && relation === 'friend');

// GET /api/friends — lista znajomych (zaakceptowane)
const listFriends = async (req, res) => {
  try {
    const userId = req.user.userId;
    const r = await query(
      `SELECT u.id, u.first_name, u.last_name, u.avatar_url
       FROM friendships f
       JOIN users u ON u.id = CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END
       WHERE (f.requester_id = $1 OR f.addressee_id = $1) AND f.status = 'accepted'
       ORDER BY u.first_name, u.last_name LIMIT 200`,
      [userId]
    );
    res.json({ friends: r.rows.map(personRow) });
  } catch (error) {
    console.error('Friends list error:', error);
    res.status(500).json({ error: { message: 'Nie udało się pobrać znajomych', status: 500 } });
  }
};

// GET /api/friends/requests — przychodzące zaproszenia
const listRequests = async (req, res) => {
  try {
    const userId = req.user.userId;
    const r = await query(
      `SELECT u.id, u.first_name, u.last_name, u.avatar_url, f.created_at
       FROM friendships f JOIN users u ON u.id = f.requester_id
       WHERE f.addressee_id = $1 AND f.status = 'pending'
       ORDER BY f.created_at DESC LIMIT 100`,
      [userId]
    );
    res.json({ requests: r.rows.map((x) => ({ ...personRow(x), createdAt: x.created_at })) });
  } catch (error) {
    console.error('Friend requests error:', error);
    res.status(500).json({ error: { message: 'Nie udało się pobrać zaproszeń', status: 500 } });
  }
};

// GET /api/friends/search?q= — szukanie osób (min 2 znaki)
const searchPeople = async (req, res) => {
  try {
    const userId = req.user.userId;
    const q = String(req.query.q || '').trim();
    if (q.length < 2) return res.json({ people: [] });
    const r = await query(
      `SELECT u.id, u.first_name, u.last_name, u.avatar_url,
              f.status AS f_status, f.requester_id AS f_requester,
              (SELECT COUNT(*)::int FROM follows WHERE follower_id = $1 AND followee_id = u.id) AS i_follow
       FROM users u
       LEFT JOIN friendships f ON (f.requester_id = $1 AND f.addressee_id = u.id)
                               OR (f.requester_id = u.id AND f.addressee_id = $1)
       WHERE u.id <> $1 AND (
           u.first_name ILIKE $2 OR u.last_name ILIKE $2
           OR (u.first_name || ' ' || u.last_name) ILIKE $2
           OR u.email ILIKE $2)
       AND NOT EXISTS (SELECT 1 FROM user_blocks WHERE (blocker_id = $1 AND blocked_id = u.id) OR (blocker_id = u.id AND blocked_id = $1))
       ORDER BY u.first_name, u.last_name LIMIT 20`,
      [userId, `%${q}%`]
    );
    res.json({
      people: r.rows.map((x) => ({
        ...personRow(x),
        relation: !x.f_status ? 'none'
          : x.f_status === 'accepted' ? 'friend'
          : x.f_requester === userId ? 'pending_out' : 'pending_in',
        isFollowing: x.i_follow > 0,
      })),
    });
  } catch (error) {
    console.error('People search error:', error);
    res.status(500).json({ error: { message: 'Nie udało się wyszukać osób', status: 500 } });
  }
};

// GET /api/friends/profile/:userId — publiczny profil na tablice
const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const otherId = parseInt(req.params.userId, 10);
    if (!Number.isFinite(otherId)) {
      return res.status(400).json({ error: { message: 'Nieprawidłowy użytkownik', status: 400 } });
    }
    const r = await query(
      `SELECT u.id, u.first_name, u.last_name, u.avatar_url, u.created_at,
              u.bio, u.city, u.birthday, u.birthday_visibility, u.wall_setting, u.messages_from,
              (SELECT COUNT(*)::int FROM user_posts WHERE user_id = u.id OR wall_user_id = u.id) AS post_count,
              (SELECT COUNT(*)::int FROM friendships WHERE status = 'accepted'
                 AND (requester_id = u.id OR addressee_id = u.id)) AS friend_count,
              (SELECT COUNT(*)::int FROM follows WHERE followee_id = u.id) AS follower_count,
              (SELECT COUNT(*)::int FROM pets WHERE user_id = u.id) AS pet_count
       FROM users u WHERE u.id = $1`,
      [otherId]
    );
    const u = r.rows[0];
    if (!u) return res.status(404).json({ error: { message: 'Użytkownik nie został znaleziony', status: 404 } });
    const isSelf = otherId === userId;
    const relation = isSelf ? 'self' : await relationOf(userId, otherId);
    const blocked = isSelf ? false : await isBlockedEither(userId, otherId);
    const iBlocked = isSelf ? false : (await query('SELECT 1 FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2', [userId, otherId])).rows.length > 0;
    const pets = await query(
      'SELECT id, name, species, breed, photo_url FROM pets WHERE user_id = $1 AND is_frozen = false ORDER BY name LIMIT 6',
      [otherId]
    );
    res.json({
      profile: {
        ...personRow(u),
        memberSince: u.created_at,
        bio: u.bio || '',
        city: u.city || '',
        birthday: canSeePrivate(u.birthday_visibility, relation, isSelf) ? u.birthday : null,
        postCount: u.post_count,
        friendCount: u.friend_count,
        followerCount: u.follower_count,
        pets: pets.rows.map((p) => ({ id: String(p.id), name: p.name, species: p.species, breed: p.breed, photoUrl: p.photo_url })),
        relation,
        isFollowing: isSelf ? false : await isFollowing(userId, otherId),
        isBlocked: iBlocked,
        canPostOnWall: isSelf || (!blocked && u.wall_setting === 'friends' && relation === 'friend'),
        canMessage: !isSelf && !blocked && (u.messages_from === 'everyone' || relation === 'friend'),
      },
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: { message: 'Nie udało się pobrać profilu', status: 500 } });
  }
};

// POST /api/friends/request {userId}
const sendRequest = async (req, res) => {
  try {
    const userId = req.user.userId;
    const otherId = parseInt(req.body?.userId, 10);
    if (!Number.isFinite(otherId) || otherId === userId) {
      return res.status(400).json({ error: { message: 'Nieprawidłowy użytkownik', status: 400 } });
    }
    const exists = await query('SELECT id FROM users WHERE id = $1', [otherId]);
    if (!exists.rows[0]) {
      return res.status(404).json({ error: { message: 'Użytkownik nie został znaleziony', status: 404 } });
    }
    if (await isBlockedEither(userId, otherId)) {
      return res.status(403).json({ error: { message: 'Nie możesz wysłać zaproszenia do tej osoby', status: 403 } });
    }
    const rel = await relationOf(userId, otherId);
    if (rel === 'friend') return res.json({ relation: 'friend' });
    if (rel === 'pending_out') return res.json({ relation: 'pending_out' });
    // zaproszenie z drugiej strony -> automatyczna akceptacja
    if (rel === 'pending_in') {
      await query(
        `UPDATE friendships SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
         WHERE requester_id = $1 AND addressee_id = $2`,
        [otherId, userId]
      );
      const me = await query('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
      notify(otherId, 'friend_accepted', 'Zaproszenie zaakceptowane', `${fullName(me.rows[0] || {})} przyjął(a) Twoje zaproszenie do znajomych.`, '/dashboard/community');
      return res.json({ relation: 'friend' });
    }
    await query(
      'INSERT INTO friendships (requester_id, addressee_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userId, otherId]
    );
    const me = await query('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
    notify(otherId, 'friend_request', 'Nowe zaproszenie do znajomych', `${fullName(me.rows[0] || {})} chce dodać Cię do znajomych.`, '/dashboard/community');
    res.status(201).json({ relation: 'pending_out' });
  } catch (error) {
    console.error('Friend request error:', error);
    res.status(500).json({ error: { message: 'Nie udało się wysłać zaproszenia', status: 500 } });
  }
};

// POST /api/friends/accept {userId} — akceptuję zaproszenie od userId
const acceptRequest = async (req, res) => {
  try {
    const userId = req.user.userId;
    const otherId = parseInt(req.body?.userId, 10);
    const r = await query(
      `UPDATE friendships SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
       WHERE requester_id = $1 AND addressee_id = $2 AND status = 'pending' RETURNING id`,
      [otherId, userId]
    );
    if (!r.rows[0]) return res.status(404).json({ error: { message: 'Nie znaleziono zaproszenia', status: 404 } });
    const me = await query('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
    notify(otherId, 'friend_accepted', 'Zaproszenie zaakceptowane', `${fullName(me.rows[0] || {})} przyjął(a) Twoje zaproszenie do znajomych.`, '/dashboard/community');
    res.json({ relation: 'friend' });
  } catch (error) {
    console.error('Friend accept error:', error);
    res.status(500).json({ error: { message: 'Nie udało się zaakceptować zaproszenia', status: 500 } });
  }
};

// POST /api/friends/decline {userId} — odrzucam / usuwam zaproszenie
const declineRequest = async (req, res) => {
  try {
    const userId = req.user.userId;
    const otherId = parseInt(req.body?.userId, 10);
    await query(
      'DELETE FROM friendships WHERE requester_id = $1 AND addressee_id = $2 AND status = $3',
      [otherId, userId, 'pending']
    );
    res.json({ relation: 'none' });
  } catch (error) {
    console.error('Friend decline error:', error);
    res.status(500).json({ error: { message: 'Nie udało się odrzucić zaproszenia', status: 500 } });
  }
};

// DELETE /api/friends/:userId — usuń znajomego / wycofaj zaproszenie
const removeFriend = async (req, res) => {
  try {
    const userId = req.user.userId;
    const otherId = parseInt(req.params.userId, 10);
    await query(
      'DELETE FROM friendships WHERE (requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1)',
      [userId, otherId]
    );
    res.json({ relation: 'none' });
  } catch (error) {
    console.error('Friend remove error:', error);
    res.status(500).json({ error: { message: 'Nie udało się usunąć znajomego', status: 500 } });
  }
};

// POST /api/friends/follow {userId}
const followUser = async (req, res) => {
  try {
    const userId = req.user.userId;
    const otherId = parseInt(req.body?.userId, 10);
    if (!Number.isFinite(otherId) || otherId === userId) {
      return res.status(400).json({ error: { message: 'Nieprawidłowy użytkownik', status: 400 } });
    }
    await query(
      'INSERT INTO follows (follower_id, followee_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userId, otherId]
    );
    const me = await query('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
    notify(otherId, 'follow', 'Nowy obserwujący', `${fullName(me.rows[0] || {})} zaczął(a) Cię obserwować.`, '/dashboard/community');
    res.status(201).json({ following: true });
  } catch (error) {
    console.error('Follow error:', error);
    res.status(500).json({ error: { message: 'Nie udało się obserwować', status: 500 } });
  }
};

// DELETE /api/friends/follow/:userId
const unfollowUser = async (req, res) => {
  try {
    const userId = req.user.userId;
    const otherId = parseInt(req.params.userId, 10);
    await query('DELETE FROM follows WHERE follower_id = $1 AND followee_id = $2', [userId, otherId]);
    res.json({ following: false });
  } catch (error) {
    console.error('Unfollow error:', error);
    res.status(500).json({ error: { message: 'Nie udało się przestać obserwować', status: 500 } });
  }
};

// GET /api/friends/:userId/friends — znajomi danej osoby (podgląd)
const listUserFriends = async (req, res) => {
  try {
    const otherId = parseInt(req.params.userId, 10);
    const r = await query(
      `SELECT u.id, u.first_name, u.last_name, u.avatar_url
       FROM friendships f
       JOIN users u ON u.id = CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END
       WHERE (f.requester_id = $1 OR f.addressee_id = $1) AND f.status = 'accepted'
       ORDER BY u.first_name, u.last_name LIMIT 60`,
      [otherId]
    );
    res.json({ friends: r.rows.map(personRow) });
  } catch (error) {
    console.error('User friends error:', error);
    res.status(500).json({ error: { message: 'Nie udało się pobrać znajomych', status: 500 } });
  }
};

// ===== Ustawienia profilu i prywatności =====

// GET /api/friends/settings — moje ustawienia
const getMySettings = async (req, res) => {
  try {
    const r = await query(
      `SELECT bio, birthday, city, wall_setting, messages_from, birthday_visibility FROM users WHERE id = $1`,
      [req.user.userId]
    );
    res.json({ settings: r.rows[0] || {} });
  } catch (error) {
    console.error('Settings get error:', error);
    res.status(500).json({ error: { message: 'Nie udało się pobrać ustawień', status: 500 } });
  }
};

// PATCH /api/friends/settings — bio, data urodzin, miasto, prywatność
const updateSettings = async (req, res) => {
  try {
    const userId = req.user.userId;
    const b = req.body || {};
    const WALL = ['friends', 'nobody'];
    const MSG = ['everyone', 'friends'];
    const VIS = ['public', 'friends', 'private'];
    const fields = {};
    if (b.bio !== undefined) fields.bio = String(b.bio).trim().slice(0, 500);
    if (b.city !== undefined) fields.city = String(b.city).trim().slice(0, 120);
    if (b.birthday !== undefined) {
      const d = String(b.birthday || '').trim();
      fields.birthday = d === '' ? null : d;
      if (fields.birthday && !/^\d{4}-\d{2}-\d{2}$/.test(fields.birthday)) {
        return res.status(400).json({ error: { message: 'Nieprawidłowa data urodzin (YYYY-MM-DD)', status: 400 } });
      }
    }
    if (b.wall_setting !== undefined) {
      if (!WALL.includes(b.wall_setting)) return res.status(400).json({ error: { message: 'Nieprawidłowe ustawienie tablicy', status: 400 } });
      fields.wall_setting = b.wall_setting;
    }
    if (b.messages_from !== undefined) {
      if (!MSG.includes(b.messages_from)) return res.status(400).json({ error: { message: 'Nieprawidłowe ustawienie wiadomości', status: 400 } });
      fields.messages_from = b.messages_from;
    }
    if (b.birthday_visibility !== undefined) {
      if (!VIS.includes(b.birthday_visibility)) return res.status(400).json({ error: { message: 'Nieprawidłowa widoczność urodzin', status: 400 } });
      fields.birthday_visibility = b.birthday_visibility;
    }
    const keys = Object.keys(fields);
    if (!keys.length) return res.json({ ok: true });
    const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    await query(`UPDATE users SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [userId, ...keys.map((k) => fields[k])]);
    res.json({ ok: true });
  } catch (error) {
    console.error('Settings update error:', error);
    res.status(500).json({ error: { message: 'Nie udało się zapisać ustawień', status: 500 } });
  }
};

// ===== Blokady =====

// POST /api/friends/block {userId} — blokuje osobę (kończy znajomość i obserwowanie)
const blockUser = async (req, res) => {
  try {
    const userId = req.user.userId;
    const otherId = parseInt(req.body?.userId, 10);
    if (!Number.isFinite(otherId) || otherId === userId) {
      return res.status(400).json({ error: { message: 'Nieprawidłowy użytkownik', status: 400 } });
    }
    await query('INSERT INTO user_blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, otherId]);
    await query('DELETE FROM friendships WHERE (requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1)', [userId, otherId]);
    await query('DELETE FROM follows WHERE (follower_id = $1 AND followee_id = $2) OR (follower_id = $2 AND followee_id = $1)', [userId, otherId]);
    res.json({ blocked: true });
  } catch (error) {
    console.error('Block error:', error);
    res.status(500).json({ error: { message: 'Nie udało się zablokować użytkownika', status: 500 } });
  }
};

// DELETE /api/friends/block/:userId
const unblockUser = async (req, res) => {
  try {
    const userId = req.user.userId;
    const otherId = parseInt(req.params.userId, 10);
    await query('DELETE FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2', [userId, otherId]);
    res.json({ blocked: false });
  } catch (error) {
    console.error('Unblock error:', error);
    res.status(500).json({ error: { message: 'Nie udało się odblokować użytkownika', status: 500 } });
  }
};

// GET /api/friends/blocked — zablokowani przeze mnie
const blockedList = async (req, res) => {
  try {
    const r = await query(
      `SELECT u.id, u.first_name, u.last_name, u.avatar_url, b.created_at
       FROM user_blocks b JOIN users u ON u.id = b.blocked_id
       WHERE b.blocker_id = $1 ORDER BY b.created_at DESC`,
      [req.user.userId]
    );
    res.json({ blocked: r.rows.map(personRow) });
  } catch (error) {
    console.error('Blocked list error:', error);
    res.status(500).json({ error: { message: 'Nie udało się pobrać listy', status: 500 } });
  }
};

module.exports = {
  listFriends, listRequests, searchPeople, getProfile,
  sendRequest, acceptRequest, declineRequest, removeFriend,
  followUser, unfollowUser, listUserFriends,
  getMySettings, updateSettings, blockUser, unblockUser, blockedList,
};
