const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { query } = require('../config/database');
const { sendTemplate } = require('../utils/email.templates');
const { verifyGoogleIdToken, verifyAppleIdentityToken } = require('../utils/oauth');
const { getSetting } = require('../utils/settings');

const nowPl = () => new Date().toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' });

const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName } = req.body;

    const allowRegistration = await getSetting('allowRegistration', true);
    if (allowRegistration === false) {
      return res.status(403).json({
        error: { message: 'Rejestracja nowych kont jest obecnie wyłączona', status: 403 },
      });
    }

    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: {
          message: 'Użytkownik z tym adresem email już istnieje',
          status: 409,
        },
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await query(
      `INSERT INTO users (email, password_hash, first_name, last_name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id, email, first_name, last_name, role, created_at`,
      [email, hashedPassword, firstName, lastName]
    );

    const user = result.rows[0];

    sendTemplate(user.email, 'welcome', { name: user.first_name || 'Użytkowniku' }).catch(() => {});

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      message: 'Rejestracja zakończona pomyślnie',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: {
        message: 'Wystąpił błąd podczas rejestracji',
        status: 500,
      },
    });
  }
};

const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const result = await query(
      'SELECT id, email, password_hash, first_name, last_name, role FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: {
          message: 'Nieprawidłowy email lub hasło',
          status: 401,
        },
      });
    }

    const user = result.rows[0];

    if (!user.password_hash) {
      return res.status(401).json({
        error: {
          message: 'To konto używa logowania przez Google lub Apple — użyj przycisku poniżej',
          status: 401,
        },
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        error: {
          message: 'Nieprawidłowy email lub hasło',
          status: 401,
        },
      });
    }

    sendTemplate(user.email, 'loginAlert', {
      name: user.first_name || 'Użytkowniku',
      when: nowPl(),
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    }).catch(() => {});

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Logowanie zakończone pomyślnie',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: {
        message: 'Wystąpił błąd podczas logowania',
        status: 500,
      },
    });
  }
};

const logout = (req, res) => {
  res.json({
    message: 'Wylogowano pomyślnie',
  });
};

// GET /api/auth/me — dane użytkownika z bazy + statystyki aktywności
const getMe = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await query(
      'SELECT id, email, first_name, last_name, phone, avatar_url, role, created_at FROM users WHERE id = $1',
      [userId]
    );
    if (user.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Użytkownik nie istnieje', status: 404 } });
    }

    const stats = await query(
      `SELECT
         (SELECT COUNT(*) FROM pets WHERE user_id = $1)::int AS pets,
         (SELECT COUNT(*) FROM forum_posts WHERE user_id = $1)::int AS forum_posts,
         (SELECT COUNT(*) FROM adoption_posts WHERE user_id = $1)::int AS adoption_posts,
         (SELECT COUNT(*) FROM lost_pets WHERE user_id = $1)::int AS lost_reports,
         (SELECT COUNT(*) FROM pet_shares WHERE owner_id = $1 AND status = 'accepted')::int AS shares_given,
         (SELECT COUNT(*) FROM pet_shares s WHERE s.status = 'accepted'
            AND (s.invitee_user_id = $1 OR LOWER(s.invitee_email) = (SELECT LOWER(email) FROM users WHERE id = $1)))::int AS shares_received`,
      [userId]
    );

    const u = user.rows[0];
    res.json({
      user: {
        id: u.id,
        email: u.email,
        firstName: u.first_name,
        lastName: u.last_name,
        phone: u.phone,
        avatarUrl: u.avatar_url,
        role: u.role,
        createdAt: u.created_at,
      },
      stats: stats.rows[0],
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: { message: 'Nie udało się pobrać profilu', status: 500 } });
  }
};

// PATCH /api/auth/me — edycja profilu (imię, nazwisko, telefon, avatar)
const updateMe = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { firstName, lastName, phone, avatarUrl, lat, lng } = req.body;

    // Last-known location (do alertow promieniowych, np. zaginione zwierzeta)
    if (lat !== undefined || lng !== undefined) {
      const la = Number(lat), lo = Number(lng);
      if (!Number.isFinite(la) || !Number.isFinite(lo) || la < -90 || la > 90 || lo < -180 || lo > 180) {
        return res.status(400).json({ error: { message: 'Nieprawidłowe współrzędne', status: 400 } });
      }
    }

    if (firstName !== undefined && !String(firstName).trim()) {
      return res.status(400).json({ error: { message: 'Imię nie może być puste', status: 400 } });
    }
    if (lastName !== undefined && !String(lastName).trim()) {
      return res.status(400).json({ error: { message: 'Nazwisko nie może być puste', status: 400 } });
    }
    if (avatarUrl !== undefined && avatarUrl) {
      const a = String(avatarUrl);
      const isDataImg = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=\s]+$/.test(a);
      const isHttpImg = /^https:\/\/.{1,500}$/i.test(a);
      if (!isDataImg && !isHttpImg) {
        return res.status(400).json({ error: { message: 'Nieprawidłowy format zdjęcia profilowego', status: 400 } });
      }
      if (a.length > 5 * 1024 * 1024) {
        return res.status(400).json({ error: { message: 'Zdjęcie jest za duże (max ~4 MB)', status: 400 } });
      }
    }

    // Dynamiczny SET — tylko przesłane pola; pusty string czyści phone/avatar
    const sets = [];
    const params = [];
    if (firstName !== undefined) {
      params.push(String(firstName).trim().slice(0, 100));
      sets.push(`first_name = $${params.length}`);
    }
    if (lastName !== undefined) {
      params.push(String(lastName).trim().slice(0, 100));
      sets.push(`last_name = $${params.length}`);
    }
    if (phone !== undefined) {
      params.push(String(phone).trim().slice(0, 30) || null);
      sets.push(`phone = $${params.length}`);
    }
    if (avatarUrl !== undefined) {
      params.push(avatarUrl || null);
      sets.push(`avatar_url = $${params.length}`);
    }
    if (lat !== undefined || lng !== undefined) {
      params.push(Number(lat), Number(lng));
      sets.push(`lat = $${params.length - 1}`, `lng = $${params.length}`, 'location_updated_at = NOW()');
    }
    if (sets.length === 0) {
      return res.status(400).json({ error: { message: 'Brak danych do aktualizacji', status: 400 } });
    }
    sets.push('updated_at = NOW()');
    params.push(userId);

    const result = await query(
      `UPDATE users SET ${sets.join(', ')}
       WHERE id = $${params.length}
       RETURNING id, email, first_name, last_name, phone, avatar_url, role, created_at`,
      params
    );

    const u = result.rows[0];
    res.json({
      user: {
        id: u.id,
        email: u.email,
        firstName: u.first_name,
        lastName: u.last_name,
        phone: u.phone,
        avatarUrl: u.avatar_url,
        role: u.role,
        createdAt: u.created_at,
      },
    });
  } catch (error) {
    console.error('Update me error:', error);
    res.status(500).json({ error: { message: 'Nie udało się zaktualizować profilu', status: 500 } });
  }
};

// POST /api/auth/change-password — wymaga obecnego hasła
const changePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword || typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      return res.status(400).json({ error: { message: 'Podaj obecne i nowe hasło', status: 400 } });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: { message: 'Nowe hasło musi mieć minimum 8 znaków', status: 400 } });
    }
    if (newPassword.length > 128 || currentPassword.length > 128) {
      return res.status(400).json({ error: { message: 'Hasło może mieć maksymalnie 128 znaków', status: 400 } });
    }
    if (newPassword === currentPassword) {
      return res.status(400).json({ error: { message: 'Nowe hasło musi różnić się od obecnego', status: 400 } });
    }

    const user = await query('SELECT password_hash, email, first_name FROM users WHERE id = $1', [userId]);
    const valid = await bcrypt.compare(currentPassword, user.rows[0]?.password_hash || '');
    if (!valid) {
      return res.status(401).json({ error: { message: 'Obecne hasło jest nieprawidłowe', status: 401 } });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hashed, userId]);
    sendTemplate(user.rows[0].email, 'passwordChanged', {
      name: user.rows[0].first_name || 'Użytkowniku', when: nowPl(),
    }).catch(() => {});
    res.json({ success: true, message: 'Hasło zostało zmienione' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: { message: 'Nie udało się zmienić hasła', status: 500 } });
  }
};

// DELETE /api/auth/me — usunięcie konta (wymaga hasła; kaskada usuwa dane)
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: { message: 'Podaj hasło, aby potwierdzić usunięcie konta', status: 400 } });
    }

    const user = await query('SELECT password_hash, email, first_name FROM users WHERE id = $1', [userId]);
    const valid = await bcrypt.compare(password, user.rows[0]?.password_hash || '');
    if (!valid) {
      return res.status(401).json({ error: { message: 'Nieprawidłowe hasło', status: 401 } });
    }

    await query('DELETE FROM users WHERE id = $1', [userId]);
    sendTemplate(user.rows[0].email, 'accountDeleted', {
      name: user.rows[0].first_name || 'Użytkowniku',
    }).catch(() => {});
    res.json({ success: true, message: 'Konto zostało usunięte' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: { message: 'Nie udało się usunąć konta', status: 500 } });
  }
};

// POST /api/auth/forgot-password — wysyła link resetu (zawsze 200 — nie zdradzamy istnienia konta)
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: { message: 'Podaj adres email', status: 400 } });
    }
    const user = (
      await query('SELECT id, email, first_name FROM users WHERE email = $1', [email.toLowerCase().trim()])
    ).rows[0];

    if (user) {
      const crypto = require('crypto');
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      await query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL '60 minutes')`,
        [user.id, tokenHash]
      );
      const resetUrl = `https://petvio.pl/reset-password?token=${rawToken}`;
      sendTemplate(user.email, 'passwordReset', {
        name: user.first_name || 'Użytkowniku',
        resetUrl,
        expiresMin: 60,
      }).catch(() => {});
    }

    res.json({ message: 'Jeśli konto istnieje, wysłaliśmy link do resetu hasła' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: { message: 'Błąd serwera', status: 500 } });
  }
};

// POST /api/auth/reset-password — ustawia nowe hasło po tokenie z maila
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body || {};
    if (!token || !password || password.length < 8) {
      return res.status(400).json({
        error: { message: 'Hasło musi mieć minimum 8 znaków', status: 400 },
      });
    }
    const crypto = require('crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const row = (
      await query(
        `SELECT prt.id, prt.user_id, u.email, u.first_name
         FROM password_reset_tokens prt JOIN users u ON u.id = prt.user_id
         WHERE prt.token_hash = $1 AND prt.used_at IS NULL AND prt.expires_at > NOW()`,
        [tokenHash]
      )
    ).rows[0];

    if (!row) {
      return res.status(400).json({
        error: { message: 'Link wygasł lub jest nieprawidłowy — poproś o nowy', status: 400 },
      });
    }

    const hashed = await bcrypt.hash(password, 12);
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hashed, row.user_id]);
    await query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1', [row.id]);

    sendTemplate(row.email, 'passwordChanged', {
      name: row.first_name || 'Użytkowniku',
      when: nowPl(),
    }).catch(() => {});

    res.json({ message: 'Hasło zostało zmienione — możesz się zalogować' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: { message: 'Błąd serwera', status: 500 } });
  }
};

// POST /api/auth/google — כניסה/הרשמה עם Google idToken
// POST /api/auth/apple — כניסה/הרשמה עם Apple identityToken (+ שם אופציונלי בפעם הראשונה)
const oauthLogin = (provider, verify) => async (req, res) => {
  try {
    const { idToken, firstName, lastName } = req.body || {};
    if (!idToken) {
      return res.status(400).json({ error: { message: 'חסר טוקן זהות', status: 400 } });
    }
    const id = await verify(idToken);
    if (!id || !id.providerId) {
      return res.status(401).json({ error: { message: 'אימות הספק נכשל', status: 401 } });
    }

    const idCol = provider === 'google' ? 'google_id' : 'apple_id';
    let user = (
      await query(
        `SELECT id, email, first_name, last_name, role FROM users WHERE ${idCol} = $1`,
        [id.providerId]
      )
    ).rows[0];

    if (!user && id.email) {
      // קישור לחשבון קיים על אותו אימייל
      const linked = await query(
        `UPDATE users SET ${idCol} = $1, updated_at = NOW() WHERE email = $2 AND ${idCol} IS NULL
         RETURNING id, email, first_name, last_name, role`,
        [id.providerId, id.email]
      );
      user = linked.rows[0];
    }

    let isNew = false;
    if (!user) {
      if (!id.email) {
        return res.status(400).json({
          error: { message: 'הספק לא החזיר אימייל — אי אפשר ליצור חשבון', status: 400 },
        });
      }
      const result = await query(
        `INSERT INTO users (email, password_hash, first_name, last_name, ${idCol}, auth_provider, created_at, updated_at)
         VALUES ($1, NULL, $2, $3, $4, $5, NOW(), NOW())
         ON CONFLICT (email) DO UPDATE SET ${idCol} = EXCLUDED.${idCol}, updated_at = NOW()
         RETURNING id, email, first_name, last_name, role`,
        [
          id.email,
          firstName || id.firstName || 'Użytkownik',
          lastName || id.lastName || '',
          id.providerId,
          provider,
        ]
      );
      user = result.rows[0];
      isNew = true;
      sendTemplate(user.email, 'welcome', { name: user.first_name || 'Użytkowniku' }).catch(() => {});
    } else {
      sendTemplate(user.email, 'loginAlert', {
        name: user.first_name || 'Użytkowniku',
        when: nowPl(),
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      }).catch(() => {});
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    res.json({
      message: 'Logowanie zakończone pomyślnie',
      token,
      isNewUser: isNew,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(`${provider} login error:`, error);
    res.status(500).json({ error: { message: 'שגיאת שרת בכניסה עם הספק', status: 500 } });
  }
};

const oauthGoogle = oauthLogin('google', verifyGoogleIdToken);
const oauthApple = oauthLogin('apple', verifyAppleIdentityToken);

module.exports = {
  register,
  login,
  logout,
  getMe,
  updateMe,
  changePassword,
  deleteAccount,
  oauthGoogle,
  oauthApple,
  forgotPassword,
  resetPassword,
};
