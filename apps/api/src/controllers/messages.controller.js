const { query } = require('../config/database');
const { notify } = require('./notifications.controller');
const { fullName } = require('./social.helpers');

const msgRow = (r) => ({
  id: String(r.id),
  senderId: String(r.sender_id),
  body: r.body,
  createdAt: r.created_at,
});

const isParticipant = async (convId, userId) => {
  const r = await query(
    'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
    [convId, userId]
  );
  return r.rows.length > 0;
};

// Czy a może pisać do b: brak blokady + ustawienie messages_from u b
const canMessage = async (a, b) => {
  const r = await query(
    `SELECT u.messages_from,
            EXISTS (SELECT 1 FROM user_blocks WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)) AS blocked,
            EXISTS (SELECT 1 FROM friendships WHERE status = 'accepted'
                    AND ((requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1))) AS friends
       FROM users u WHERE u.id = $2`,
    [a, b]
  );
  const o = r.rows[0];
  if (!o) return { ok: false, reason: 'notfound' };
  if (o.blocked) return { ok: false, reason: 'blocked' };
  if (o.messages_from === 'friends' && !o.friends) return { ok: false, reason: 'friends_only' };
  return { ok: true };
};

const MSG_ERR = {
  blocked: 'Nie możesz wysłać wiadomości do tej osoby.',
  friends_only: 'Ta osoba przyjmuje wiadomości tylko od znajomych.',
  notfound: 'Użytkownik nie został znaleziony',
};

// GET /api/messages/conversations — lista rozmów z folderami, pin/mute i nieprzeczytanymi
const listConversations = async (req, res) => {
  try {
    const userId = req.user.userId;
    const r = await query(
      `SELECT c.id AS conv_id, cp.folder_id, cp.pinned, cp.muted,
              u.id AS other_id, u.first_name, u.last_name, u.avatar_url,
              (SELECT m.id FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_msg_id,
              (SELECT m.body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_msg_body,
              (SELECT m.sender_id FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_msg_sender,
              (SELECT m.created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_msg_at,
              (SELECT COUNT(*)::int FROM messages m WHERE m.conversation_id = c.id
                 AND m.id > cp.last_read_message_id AND m.sender_id <> $1) AS unread
       FROM conversations c
       JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = $1
       JOIN conversation_participants ocp ON ocp.conversation_id = c.id AND ocp.user_id <> $1
       JOIN users u ON u.id = ocp.user_id
       WHERE (cp.hidden_at IS NULL OR EXISTS (
                SELECT 1 FROM messages mh WHERE mh.conversation_id = c.id AND mh.created_at > cp.hidden_at))
       ORDER BY cp.pinned DESC, last_msg_at DESC NULLS LAST, c.id DESC LIMIT 200`,
      [userId]
    );
    res.json({
      conversations: r.rows.map((x) => ({
        id: String(x.conv_id),
        other: { id: String(x.other_id), name: fullName(x), avatarUrl: x.avatar_url || null },
        lastMessage: x.last_msg_body ? { body: x.last_msg_body, mine: x.last_msg_sender === userId, createdAt: x.last_msg_at } : null,
        unread: x.unread,
        folderId: x.folder_id ? String(x.folder_id) : null,
        pinned: !!x.pinned,
        muted: !!x.muted,
      })),
    });
  } catch (error) {
    console.error('Conversations list error:', error);
    res.status(500).json({ error: { message: 'Nie udało się pobrać rozmów', status: 500 } });
  }
};

// POST /api/messages/conversations {userId} — znajdź lub utwórz rozmowę 1:1
const openConversation = async (req, res) => {
  try {
    const userId = req.user.userId;
    const otherId = parseInt(req.body?.userId, 10);
    if (!Number.isFinite(otherId) || otherId === userId) {
      return res.status(400).json({ error: { message: 'Nieprawidłowy użytkownik', status: 400 } });
    }
    const other = await query('SELECT id, first_name, last_name, avatar_url FROM users WHERE id = $1', [otherId]);
    if (!other.rows[0]) {
      return res.status(404).json({ error: { message: 'Użytkownik nie został znaleziony', status: 404 } });
    }
    const perm = await canMessage(userId, otherId);
    if (!perm.ok) {
      return res.status(403).json({ error: { message: MSG_ERR[perm.reason] || 'Brak uprawnień', status: 403 } });
    }
    const existing = await query(
      `SELECT c.id FROM conversations c
       JOIN conversation_participants a ON a.conversation_id = c.id AND a.user_id = $1
       JOIN conversation_participants b ON b.conversation_id = c.id AND b.user_id = $2
       LIMIT 1`,
      [userId, otherId]
    );
    let convId = existing.rows[0]?.id;
    if (!convId) {
      const ins = await query('INSERT INTO conversations DEFAULT VALUES RETURNING id');
      convId = ins.rows[0].id;
      await query(
        'INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3)',
        [convId, userId, otherId]
      );
    }
    res.json({
      conversation: {
        id: String(convId),
        other: { id: String(otherId), name: fullName(other.rows[0]), avatarUrl: other.rows[0].avatar_url || null },
      },
    });
  } catch (error) {
    console.error('Open conversation error:', error);
    res.status(500).json({ error: { message: 'Nie udało się otworzyć rozmowy', status: 500 } });
  }
};

// GET /api/messages/conversations/:id/messages?afterId= — pobranie (polling)
const listMessages = async (req, res) => {
  try {
    const userId = req.user.userId;
    const convId = parseInt(req.params.id, 10);
    if (!(await isParticipant(convId, userId))) {
      return res.status(403).json({ error: { message: 'Brak dostępu do rozmowy', status: 403 } });
    }
    const afterId = parseInt(req.query.afterId, 10) || 0;
    const beforeId = parseInt(req.query.beforeId, 10) || 0;
    const hiddenAt = await query(
      'SELECT hidden_at FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
      [convId, userId]
    );
    const hideFrom = hiddenAt.rows[0]?.hidden_at || null;
    const r = await query(
      `SELECT m.id, m.sender_id, m.body, m.created_at
       FROM messages m WHERE m.conversation_id = $1 AND m.id > $2
         AND ($3::int = 0 OR m.id < $3)
         AND ($4::timestamptz IS NULL OR m.created_at > $4)
       ORDER BY m.id DESC LIMIT 60`,
      [convId, afterId, beforeId, hideFrom]
    );
    const other = await query(
      `SELECT u.id, u.first_name, u.last_name, u.avatar_url,
              cp.last_read_message_id, cp.last_read_at
       FROM conversation_participants cp JOIN users u ON u.id = cp.user_id
       WHERE cp.conversation_id = $1 AND cp.user_id <> $2`,
      [convId, userId]
    );
    const o = other.rows[0];
    res.json({
      messages: r.rows.map(msgRow).reverse(),
      other: o
        ? { id: String(o.id), name: fullName(o), avatarUrl: o.avatar_url || null }
        : null,
      otherReadMessageId: o ? Number(o.last_read_message_id) : 0,
      otherReadAt: o ? o.last_read_at : null,
    });
  } catch (error) {
    console.error('Messages list error:', error);
    res.status(500).json({ error: { message: 'Nie udało się pobrać wiadomości', status: 500 } });
  }
};

// POST /api/messages/conversations/:id/messages {body}
const sendMessage = async (req, res) => {
  try {
    const userId = req.user.userId;
    const convId = parseInt(req.params.id, 10);
    if (!(await isParticipant(convId, userId))) {
      return res.status(403).json({ error: { message: 'Brak dostępu do rozmowy', status: 403 } });
    }
    const body = String(req.body?.body || '').trim().slice(0, 2000);
    if (!body) {
      return res.status(400).json({ error: { message: 'Wiadomość nie może być pusta', status: 400 } });
    }
    // sprawdź uprawnienia względem rozmówcy (blokada / tylko znajomi)
    const others = await query(
      'SELECT user_id FROM conversation_participants WHERE conversation_id = $1 AND user_id <> $2',
      [convId, userId]
    );
    for (const o of others.rows) {
      const perm = await canMessage(userId, o.user_id);
      if (!perm.ok) {
        return res.status(403).json({ error: { message: MSG_ERR[perm.reason] || 'Brak uprawnień', status: 403 } });
      }
    }
    const ins = await query(
      'INSERT INTO messages (conversation_id, sender_id, body) VALUES ($1, $2, $3) RETURNING id, sender_id, body, created_at',
      [convId, userId, body]
    );
    // własna wiadomość = przeczytana (ukryta rozmowa odkryje się sama — EXISTS w listConversations,
    // a stare wiadomości sprzed ukrycia pozostają niewidoczne dla ukrywającego)
    await query(
      'UPDATE conversation_participants SET last_read_message_id = $1, last_read_at = NOW() WHERE conversation_id = $2 AND user_id = $3',
      [ins.rows[0].id, convId, userId]
    );
    // powiadomienie dla rozmówcy — tylko przy pierwszej wiadomości w konwersacji i gdy nie wyciszył
    const cnt = await query('SELECT COUNT(*)::int AS c FROM messages WHERE conversation_id = $1', [convId]);
    if (cnt.rows[0].c === 1) {
      const me = await query('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
      for (const o of others.rows) {
        const muted = await query(
          'SELECT muted FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
          [convId, o.user_id]
        );
        if (!muted.rows[0]?.muted) {
          notify(o.user_id, 'message', 'Nowa wiadomość', `${fullName(me.rows[0] || {})} napisał(a) do Ciebie na Messengera.`, '/dashboard/messages');
        }
      }
    }
    res.status(201).json({ message: msgRow(ins.rows[0]) });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: { message: 'Nie udało się wysłać wiadomości', status: 500 } });
  }
};

// POST /api/messages/conversations/:id/read {messageId} — oznacz jako przeczytane
const markRead = async (req, res) => {
  try {
    const userId = req.user.userId;
    const convId = parseInt(req.params.id, 10);
    if (!(await isParticipant(convId, userId))) {
      return res.status(403).json({ error: { message: 'Brak dostępu do rozmowy', status: 403 } });
    }
    const msgId = parseInt(req.body?.messageId, 10) || 0;
    await query(
      `UPDATE conversation_participants
         SET last_read_message_id = GREATEST(last_read_message_id, $1),
             last_read_at = CASE WHEN $1 > last_read_message_id THEN NOW() ELSE last_read_at END
       WHERE conversation_id = $2 AND user_id = $3`,
      [msgId, convId, userId]
    );
    res.json({ ok: true });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: { message: 'Nie udało się oznaczyć jako przeczytane', status: 500 } });
  }
};

// POST /api/messages/conversations/:id/hide — „usuń rozmowę" dla mnie (wraca przy nowej wiadomości)
const hideConversation = async (req, res) => {
  try {
    const userId = req.user.userId;
    const convId = parseInt(req.params.id, 10);
    if (!(await isParticipant(convId, userId))) {
      return res.status(403).json({ error: { message: 'Brak dostępu do rozmowy', status: 403 } });
    }
    await query(
      `UPDATE conversation_participants
         SET hidden_at = NOW(),
             last_read_message_id = (SELECT COALESCE(MAX(id), 0) FROM messages WHERE conversation_id = $1),
             last_read_at = NOW()
       WHERE conversation_id = $1 AND user_id = $2`,
      [convId, userId]
    );
    res.json({ ok: true });
  } catch (error) {
    console.error('Hide conversation error:', error);
    res.status(500).json({ error: { message: 'Nie udało się usunąć rozmowy', status: 500 } });
  }
};

// POST /api/messages/conversations/:id/flags {pinned?, muted?}
const setFlags = async (req, res) => {
  try {
    const userId = req.user.userId;
    const convId = parseInt(req.params.id, 10);
    if (!(await isParticipant(convId, userId))) {
      return res.status(403).json({ error: { message: 'Brak dostępu do rozmowy', status: 403 } });
    }
    const sets = [];
    const vals = [convId, userId];
    if (req.body?.pinned !== undefined) { vals.push(!!req.body.pinned); sets.push(`pinned = $${vals.length}`); }
    if (req.body?.muted !== undefined) { vals.push(!!req.body.muted); sets.push(`muted = $${vals.length}`); }
    if (!sets.length) return res.json({ ok: true });
    await query(
      `UPDATE conversation_participants SET ${sets.join(', ')} WHERE conversation_id = $1 AND user_id = $2`,
      vals
    );
    res.json({ ok: true });
  } catch (error) {
    console.error('Conv flags error:', error);
    res.status(500).json({ error: { message: 'Nie udało się zapisać ustawień', status: 500 } });
  }
};

// POST /api/messages/conversations/:id/folder {folderId|null}
const setFolder = async (req, res) => {
  try {
    const userId = req.user.userId;
    const convId = parseInt(req.params.id, 10);
    if (!(await isParticipant(convId, userId))) {
      return res.status(403).json({ error: { message: 'Brak dostępu do rozmowy', status: 403 } });
    }
    const folderId = req.body?.folderId ? parseInt(req.body.folderId, 10) : null;
    if (folderId !== null) {
      const f = await query('SELECT id FROM message_folders WHERE id = $1 AND user_id = $2', [folderId, userId]);
      if (!f.rows[0]) return res.status(404).json({ error: { message: 'Folder nie istnieje', status: 404 } });
    }
    await query(
      'UPDATE conversation_participants SET folder_id = $1 WHERE conversation_id = $2 AND user_id = $3',
      [folderId, convId, userId]
    );
    res.json({ ok: true });
  } catch (error) {
    console.error('Conv folder error:', error);
    res.status(500).json({ error: { message: 'Nie udało się przenieść rozmowy', status: 500 } });
  }
};

// ===== Foldery =====

const listFolders = async (req, res) => {
  try {
    const r = await query(
      `SELECT f.id, f.name, f.sort_order,
              (SELECT COUNT(*)::int FROM conversation_participants cp WHERE cp.folder_id = f.id AND cp.user_id = $1) AS conv_count
       FROM message_folders f WHERE f.user_id = $1 ORDER BY f.sort_order, f.id`,
      [req.user.userId]
    );
    res.json({ folders: r.rows.map((f) => ({ id: String(f.id), name: f.name, convCount: f.conv_count })) });
  } catch (error) {
    console.error('Folders list error:', error);
    res.status(500).json({ error: { message: 'Nie udało się pobrać folderów', status: 500 } });
  }
};

const createFolder = async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim().slice(0, 60);
    if (!name) return res.status(400).json({ error: { message: 'Podaj nazwę folderu', status: 400 } });
    const ins = await query(
      `INSERT INTO message_folders (user_id, name, sort_order)
       VALUES ($1, $2, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM message_folders WHERE user_id = $1)) RETURNING id, name`,
      [req.user.userId, name]
    );
    res.status(201).json({ folder: { id: String(ins.rows[0].id), name: ins.rows[0].name, convCount: 0 } });
  } catch (error) {
    console.error('Folder create error:', error);
    res.status(500).json({ error: { message: 'Nie udało się utworzyć folderu', status: 500 } });
  }
};

const renameFolder = async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim().slice(0, 60);
    if (!name) return res.status(400).json({ error: { message: 'Podaj nazwę folderu', status: 400 } });
    const r = await query(
      'UPDATE message_folders SET name = $1 WHERE id = $2 AND user_id = $3 RETURNING id',
      [name, req.params.id, req.user.userId]
    );
    if (!r.rows[0]) return res.status(404).json({ error: { message: 'Folder nie istnieje', status: 404 } });
    res.json({ ok: true });
  } catch (error) {
    console.error('Folder rename error:', error);
    res.status(500).json({ error: { message: 'Nie udało się zmienić nazwy', status: 500 } });
  }
};

const deleteFolder = async (req, res) => {
  try {
    // ON DELETE SET NULL na folder_id — rozmowy wracają do Skrzynki
    const r = await query('DELETE FROM message_folders WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.user.userId]);
    if (!r.rows[0]) return res.status(404).json({ error: { message: 'Folder nie istnieje', status: 404 } });
    res.json({ ok: true });
  } catch (error) {
    console.error('Folder delete error:', error);
    res.status(500).json({ error: { message: 'Nie udało się usunąć folderu', status: 500 } });
  }
};

// GET /api/messages/unread — łączna liczba nieprzeczytanych (bez wyciszonych)
const unreadTotal = async (req, res) => {
  try {
    const userId = req.user.userId;
    const r = await query(
      `SELECT COALESCE(SUM(cnt), 0)::int AS total FROM (
         SELECT (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = cp.conversation_id
                  AND m.id > cp.last_read_message_id AND m.sender_id <> cp.user_id) AS cnt
         FROM conversation_participants cp WHERE cp.user_id = $1 AND NOT cp.muted
       ) t`,
      [userId]
    );
    res.json({ unread: r.rows[0].total });
  } catch (error) {
    console.error('Unread total error:', error);
    res.status(500).json({ error: { message: 'Nie udało się pobrać licznika', status: 500 } });
  }
};

module.exports = {
  listConversations, openConversation, listMessages, sendMessage, markRead,
  setFlags, setFolder, listFolders, createFolder, renameFolder, deleteFolder,
  hideConversation, unreadTotal,
};
