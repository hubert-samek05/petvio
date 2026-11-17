const { query, pool } = require('../config/database');
const { templates, sendMail } = require('../utils/email.templates');
const { notify } = require('./notifications.controller');
const { getEffectivePlan, upgradeError, petFrozen, reconcileLimits } = require('../utils/subscription');

const PERMISSION_KEYS = ['health', 'activity', 'nutrition', 'budget', 'breeding', 'forum', 'statistics'];
const VALID_ROLES = ['family', 'petsitter', 'vet', 'other'];
const ROLE_LABELS = { family: 'Rodzina', petsitter: 'Petsitter', vet: 'Weterynarz', other: 'Inna osoba' };

const mapShareRow = (r) => ({
  id: String(r.id),
  email: r.invitee_email,
  name: [r.invitee_first_name, r.invitee_last_name].filter(Boolean).join(' ') || null,
  role: r.role,
  status: r.status,
  permissions: r.permissions,
  invitedAt: r.invited_at,
  acceptedAt: r.status !== 'pending' ? r.responded_at : null,
  petIds: (r.pet_ids || []).map(String),
  petNames: r.pet_names || [],
});

// GET /api/sharing — udostępnienia nadane przeze mnie + oczekujące na moją odpowiedź
const getShares = async (req, res) => {
  try {
    const userId = req.user.userId;
    const me = await query('SELECT email FROM users WHERE id = $1', [userId]);
    const myEmail = me.rows[0]?.email?.toLowerCase();

    const outgoing = await query(
      `SELECT s.*, u.first_name AS invitee_first_name, u.last_name AS invitee_last_name,
              ARRAY_AGG(sp.pet_id) AS pet_ids, ARRAY_AGG(p.name) AS pet_names
       FROM pet_shares s
       LEFT JOIN users u ON u.id = s.invitee_user_id
       LEFT JOIN pet_share_pets sp ON sp.share_id = s.id
       LEFT JOIN pets p ON p.id = sp.pet_id
       WHERE s.owner_id = $1
       GROUP BY s.id, u.first_name, u.last_name
       ORDER BY s.invited_at DESC`,
      [userId]
    );

    const incoming = myEmail
      ? await query(
          `SELECT s.*, o.first_name AS owner_first_name, o.last_name AS owner_last_name, o.email AS owner_email,
                  ARRAY_AGG(sp.pet_id) AS pet_ids, ARRAY_AGG(p.name) AS pet_names
           FROM pet_shares s
           JOIN users o ON o.id = s.owner_id
           LEFT JOIN pet_share_pets sp ON sp.share_id = s.id
           LEFT JOIN pets p ON p.id = sp.pet_id
           WHERE LOWER(s.invitee_email) = $1 AND s.status = 'pending'
           GROUP BY s.id, o.first_name, o.last_name, o.email
           ORDER BY s.invited_at DESC`,
          [myEmail]
        )
      : { rows: [] };

    res.json({
      shared: outgoing.rows.map(mapShareRow),
      pendingInvites: incoming.rows.map((r) => ({
        id: String(r.id),
        ownerName: `${r.owner_first_name || ''} ${r.owner_last_name || ''}`.trim() || r.owner_email,
        ownerEmail: r.owner_email,
        role: r.role,
        petNames: r.pet_names || [],
        invitedAt: r.invited_at,
      })),
    });
  } catch (error) {
    console.error('Get shares error:', error);
    res.status(500).json({ error: { message: 'Nie udało się pobrać udostępnień', status: 500 } });
  }
};

// POST /api/sharing/invite — wyślij zaproszenie (mail przez Resend gdy klucz dostępny)
const invite = async (req, res) => {
  const client = await pool.connect();
  try {
    const ownerId = req.user.userId;
    const { email, role, petIds, permissions } = req.body;

    const normEmail = String(email || '').trim().toLowerCase();
    if (!normEmail || normEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normEmail)) {
      return res.status(400).json({ error: { message: 'Podaj prawidłowy adres email', status: 400 } });
    }
    if (!Array.isArray(petIds) || petIds.length === 0 || petIds.length > 50) {
      return res.status(400).json({ error: { message: 'Wybierz co najmniej jedno zwierzę', status: 400 } });
    }
    const petIdNums = petIds.map(Number);
    if (petIdNums.some((n) => !Number.isInteger(n) || n <= 0)) {
      return res.status(400).json({ error: { message: 'Nieprawidłowe ID zwierzęcia', status: 400 } });
    }
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: { message: 'Nieprawidłowa rola', status: 400 } });
    }

    const owner = await query('SELECT email, first_name, last_name FROM users WHERE id = $1', [ownerId]);
    const ownerRow = owner.rows[0];
    if (ownerRow?.email?.toLowerCase() === normEmail) {
      return res.status(400).json({ error: { message: 'Nie możesz udostępnić sobie', status: 400 } });
    }

    // Zweryfikuj własność wszystkich pupili
    const owned = await query('SELECT id, name, is_frozen FROM pets WHERE user_id = $1 AND id = ANY($2::int[])', [
      ownerId,
      petIdNums,
    ]);
    if (owned.rows.length !== petIds.length) {
      return res.status(403).json({ error: { message: 'Możesz udostępniać tylko swoje zwierzęta', status: 403 } });
    }
    if (owned.rows.some((p) => p.is_frozen)) return petFrozen(res);

    const cleanPermissions = {};
    PERMISSION_KEYS.forEach((k) => (cleanPermissions[k] = !!permissions?.[k]));

    const invitee = await query('SELECT id FROM users WHERE LOWER(email) = $1', [normEmail]);
    const inviteeUserId = invitee.rows[0]?.id || null;

    // Anty-spam: limit aktywnych udostępnień na właściciela
    const count = await query('SELECT COUNT(*)::int AS c FROM pet_shares WHERE owner_id = $1', [ownerId]);
    if (count.rows[0].c >= 50) {
      return res.status(429).json({ error: { message: 'Osiągnięto limit udostępnień (50)', status: 429 } });
    }

    // Limit osób do współdzielenia wg planu (ponowne zaproszenie tej samej osoby nie zwiększa licznika)
    const eff = await getEffectivePlan(ownerId);
    if (eff && eff.plan.maxShares !== null) {
      const active = await query(
        `SELECT COUNT(*)::int AS c FROM pet_shares
         WHERE owner_id = $1 AND status IN ('pending','accepted') AND invitee_email <> $2`,
        [ownerId, normEmail]
      );
      if (active.rows[0].c >= eff.plan.maxShares) {
        return upgradeError(
          res,
          'SHARE_LIMIT',
          `Wykorzystano limit osób do współdzielenia w planie ${eff.plan.name} (${eff.plan.maxShares}). Przejdź na wyższy plan, aby zaprosić więcej osób.`,
          { limit: eff.plan.maxShares, plan: eff.planId, requiredPlan: eff.planId === 'mini' ? 'family' : 'xl' }
        );
      }
    }

    await client.query('BEGIN');

    // Upsert zaproszenia (ponowne wysłanie aktualizuje)
    const upsert = await client.query(
      `INSERT INTO pet_shares (owner_id, invitee_email, invitee_user_id, role, permissions, status, invited_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', CURRENT_TIMESTAMP)
       ON CONFLICT (owner_id, invitee_email)
       DO UPDATE SET role = EXCLUDED.role, permissions = EXCLUDED.permissions,
                     status = 'pending', invited_at = CURRENT_TIMESTAMP,
                     invitee_user_id = EXCLUDED.invitee_user_id, responded_at = NULL
       RETURNING id`,
      [ownerId, normEmail, inviteeUserId, role, JSON.stringify(cleanPermissions)]
    );
    const shareId = upsert.rows[0].id;

    await client.query('DELETE FROM pet_share_pets WHERE share_id = $1', [shareId]);
    for (const pid of petIds) {
      await client.query('INSERT INTO pet_share_pets (share_id, pet_id) VALUES ($1, $2)', [shareId, Number(pid)]);
    }

    await client.query('COMMIT');

    const inviterNameNotif = `${ownerRow?.first_name || ''} ${ownerRow?.last_name || ''}`.trim() || ownerRow?.email;
    const petNamesNotif = owned.rows.map((p) => p.name).join(', ');
    notify(
      inviteeUserId,
      'share_invite',
      'Nowe zaproszenie do współdzielenia',
      `${inviterNameNotif} zaprasza Cię do opieki nad: ${petNamesNotif}`,
      '/dashboard/sharing'
    ).catch(() => {});

    // Mail — szablon gotowy, wysyłka gdy RESEND_API_KEY obecny
    const inviterName = `${ownerRow?.first_name || ''} ${ownerRow?.last_name || ''}`.trim() || ownerRow?.email;
    const petNames = owned.rows.map((p) => p.name).join(', ');
    const appUrl = (process.env.APP_URL || 'https://petvio.pl').replace(/\/+$/, '');
    const tpl = templates.shareInvite({
      inviterName,
      inviterEmail: ownerRow?.email,
      petNames,
      roleLabel: ROLE_LABELS[role],
      acceptUrl: `${appUrl}/dashboard/sharing`,
    });
    sendMail({ to: normEmail, subject: tpl.subject, html: tpl.html }).catch(() => {});

    res.status(201).json({ id: shareId });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Invite error:', error);
    res.status(500).json({ error: { message: 'Nie udało się wysłać zaproszenia', status: 500 } });
  } finally {
    client.release();
  }
};

// POST /api/sharing/:id/respond — zaproszony akceptuje/odrzuca (po emailu)
const respond = async (req, res) => {
  try {
    const { accept } = req.body;
    if (typeof accept !== 'boolean') {
      return res.status(400).json({ error: { message: 'Pole accept musi być typu boolean', status: 400 } });
    }
    const userId = req.user.userId;
    const me = await query('SELECT email, first_name, last_name FROM users WHERE id = $1', [userId]);
    const myEmail = me.rows[0]?.email?.toLowerCase();

    const result = await query(
      `UPDATE pet_shares
       SET status = $1, responded_at = CURRENT_TIMESTAMP, invitee_user_id = $2
       WHERE id = $3 AND LOWER(invitee_email) = $4 AND status = 'pending'
       RETURNING id, owner_id`,
      [accept ? 'accepted' : 'rejected', userId, req.params.id, myEmail]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Zaproszenie nie istnieje lub już wygasło', status: 404 } });
    }

    // Powiadom właściciela o akceptacji (Resend gdy klucz obecny)
    if (accept) {
      const shareId = result.rows[0].id;
      const info = await query(
        `SELECT o.email AS owner_email, o.first_name AS owner_first_name,
                (SELECT ARRAY_AGG(p.name) FROM pet_share_pets sp JOIN pets p ON p.id = sp.pet_id WHERE sp.share_id = $1) AS pet_names
         FROM pet_shares s JOIN users o ON o.id = s.owner_id WHERE s.id = $1`,
        [shareId]
      );
      if (info.rows[0]?.owner_email) {
        const inviteeName = `${me.rows[0]?.first_name || ''} ${me.rows[0]?.last_name || ''}`.trim() || myEmail;
        const tpl = templates.shareAccepted({
          ownerName: info.rows[0].owner_first_name || 'Użytkowniku',
          inviteeName,
          petNames: (info.rows[0].pet_names || []).join(', '),
        });
        sendMail({ to: info.rows[0].owner_email, subject: tpl.subject, html: tpl.html }).catch(() => {});
      }
    }

    // Powiadom właściciela w aplikacji
    const shareInfo = await query(
      `SELECT s.owner_id, (SELECT ARRAY_AGG(p.name) FROM pet_share_pets sp JOIN pets p ON p.id = sp.pet_id WHERE sp.share_id = s.id) AS pet_names
       FROM pet_shares s WHERE s.id = $1`,
      [result.rows[0].id]
    );
    const inviteeName = `${me.rows[0]?.first_name || ''} ${me.rows[0]?.last_name || ''}`.trim() || myEmail;
    notify(
      shareInfo.rows[0]?.owner_id,
      accept ? 'share_accepted' : 'share_rejected',
      accept ? 'Zaproszenie zaakceptowane' : 'Zaproszenie odrzucone',
      `${inviteeName} ${accept ? 'zaakceptował(a)' : 'odrzucił(a)'} zaproszenie do: ${(shareInfo.rows[0]?.pet_names || []).join(', ')}`,
      '/dashboard/sharing'
    ).catch(() => {});

    res.json({ success: true, status: accept ? 'accepted' : 'rejected' });
  } catch (error) {
    console.error('Respond error:', error);
    res.status(500).json({ error: { message: 'Nie udało się odpowiedzieć na zaproszenie', status: 500 } });
  }
};

// PATCH /api/sharing/:id — właściciel zmienia uprawnienia/zakres pupili
const updateShare = async (req, res) => {
  const client = await pool.connect();
  try {
    const { petIds, permissions } = req.body;
    const share = await query('SELECT id FROM pet_shares WHERE id = $1 AND owner_id = $2', [
      req.params.id,
      req.user.userId,
    ]);
    if (share.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Udostępnienie nie istnieje', status: 404 } });
    }

    await client.query('BEGIN');

    if (permissions) {
      const clean = {};
      PERMISSION_KEYS.forEach((k) => (clean[k] = !!permissions[k]));
      await client.query('UPDATE pet_shares SET permissions = $1 WHERE id = $2', [
        JSON.stringify(clean),
        req.params.id,
      ]);
    }

    if (Array.isArray(petIds)) {
      const owned = await query('SELECT id FROM pets WHERE user_id = $1 AND is_frozen = false AND id = ANY($2::int[])', [
        req.user.userId,
        petIds.map(Number),
      ]);
      await client.query('DELETE FROM pet_share_pets WHERE share_id = $1', [req.params.id]);
      for (const p of owned.rows) {
        await client.query('INSERT INTO pet_share_pets (share_id, pet_id) VALUES ($1, $2)', [req.params.id, p.id]);
      }
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Update share error:', error);
    res.status(500).json({ error: { message: 'Nie udało się zaktualizować udostępnienia', status: 500 } });
  } finally {
    client.release();
  }
};

// DELETE /api/sharing/:id — właściciel odbiera dostęp
const revokeShare = async (req, res) => {
  try {
    // Nazwy pupili i dane do maila PRZED usunięciem (pet_share_pets kasuje się kaskadowo)
    const before = await query(
      `SELECT s.status, s.invitee_email, (o.first_name || ' ' || o.last_name) AS owner_name,
              (SELECT ARRAY_AGG(p.name) FROM pet_share_pets sp JOIN pets p ON p.id = sp.pet_id WHERE sp.share_id = s.id) AS pet_names
       FROM pet_shares s JOIN users o ON o.id = s.owner_id
       WHERE s.id = $1 AND s.owner_id = $2`,
      [req.params.id, req.user.userId]
    );
    if (before.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Udostępnienie nie istnieje', status: 404 } });
    }
    const { status, invitee_email, owner_name, pet_names } = before.rows[0];

    await query('DELETE FROM pet_shares WHERE id = $1', [req.params.id]);
    await reconcileLimits(req.user.userId).catch(() => {});

    // Mail do zaproszonego o odebraniu dostępu (tylko gdy był zaakceptowany)
    if (status === 'accepted') {
      const tpl = templates.shareRevoked({
        ownerName: (owner_name || '').trim() || 'Właściciel',
        petNames: (pet_names || []).join(', ') || 'pupil',
      });
      sendMail({ to: invitee_email, subject: tpl.subject, html: tpl.html }).catch(() => {});
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Revoke error:', error);
    res.status(500).json({ error: { message: 'Nie udało się usunąć udostępnienia', status: 500 } });
  }
};

// GET /api/sharing/shared-pets — pupile udostępnione MNIE (zaakceptowane)
const getSharedPets = async (req, res) => {
  try {
    const userId = req.user.userId;
    const me = await query('SELECT email FROM users WHERE id = $1', [userId]);
    const myEmail = me.rows[0]?.email?.toLowerCase();
    if (!myEmail) return res.json({ pets: [] });

    const result = await query(
      `SELECT DISTINCT p.id, p.name, p.species, p.breed, p.birth_date, p.gender, p.weight, p.photo_url,
              s.permissions, s.role, s.id AS share_id,
              o.first_name AS owner_first_name, o.last_name AS owner_last_name
       FROM pet_shares s
       JOIN pet_share_pets sp ON sp.share_id = s.id
       JOIN pets p ON p.id = sp.pet_id
       JOIN users o ON o.id = s.owner_id
       WHERE s.status = 'accepted' AND s.is_frozen = false AND p.is_frozen = false AND (s.invitee_user_id = $1 OR LOWER(s.invitee_email) = $2)
       ORDER BY p.name`,
      [userId, myEmail]
    );
    res.json({
      pets: result.rows.map((r) => ({
        id: String(r.id),
        shareId: String(r.share_id),
        name: r.name,
        species: r.species,
        breed: r.breed,
        birthDate: r.birth_date,
        gender: r.gender,
        weight: r.weight ? Number(r.weight) : null,
        photoUrl: r.photo_url,
        permissions: r.permissions,
        role: r.role,
        ownerName: `${r.owner_first_name || ''} ${r.owner_last_name || ''}`.trim(),
      })),
    });
  } catch (error) {
    console.error('Shared pets error:', error);
    res.status(500).json({ error: { message: 'Nie udało się pobrać udostępnionych zwierząt', status: 500 } });
  }
};

// GET /api/sharing/shared-pets/:petId — podgląd profilu wg uprawnień (zdrowie gdy health)
const getSharedPetDetail = async (req, res) => {
  try {
    const userId = req.user.userId;
    const petId = Number(req.params.petId);
    if (!Number.isInteger(petId) || petId <= 0) {
      return res.status(400).json({ error: { message: 'Nieprawidłowe ID zwierzęcia', status: 400 } });
    }
    const me = await query('SELECT email FROM users WHERE id = $1', [userId]);
    const myEmail = me.rows[0]?.email?.toLowerCase();

    const share = await query(
      `SELECT s.id, s.permissions FROM pet_shares s
       JOIN pet_share_pets sp ON sp.share_id = s.id
       WHERE sp.pet_id = $1 AND s.status = 'accepted' AND s.is_frozen = false
         AND (s.invitee_user_id = $2 OR LOWER(s.invitee_email) = $3)
       LIMIT 1`,
      [petId, userId, myEmail]
    );
    if (share.rows.length === 0) {
      return res.status(403).json({ error: { message: 'Brak dostępu do tego zwierzęcia', status: 403 } });
    }

    const permissions = share.rows[0].permissions || {};
    const pet = await query(
      'SELECT id, name, species, breed, birth_date, gender, weight, photo_url, microchip_number FROM pets WHERE id = $1 AND is_frozen = false',
      [petId]
    );
    if (pet.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Zwierzę nie istnieje', status: 404 } });
    }

    const data = { pet: pet.rows[0], permissions };

    if (permissions.health) {
      const health = await query(
        `SELECT id, record_type, title, record_date, veterinarian, description, next_date
         FROM health_records WHERE pet_id = $1 ORDER BY record_date DESC LIMIT 50`,
        [petId]
      );
      data.healthRecords = health.rows;
    }

    res.json(data);
  } catch (error) {
    console.error('Shared pet detail error:', error);
    res.status(500).json({ error: { message: 'Nie udało się pobrać profilu zwierzęcia', status: 500 } });
  }
};

module.exports = { getShares, invite, respond, updateShare, revokeShare, getSharedPets, getSharedPetDetail };
