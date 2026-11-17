const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { getSetting } = require('../utils/settings');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: {
        message: 'Brak tokenu autoryzacji',
        status: 401,
      },
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
    if (err) {
      return res.status(401).json({
        error: {
          message: 'Token jest nieprawidłowy lub wygasł',
          status: 401,
        },
      });
    }

    req.user = user;

    // Tryb konserwacji: przepuszcza tylko administratorow
    try {
      const maintenance = await getSetting('maintenanceMode', false);
      if (maintenance === true) {
        const r = await query('SELECT role FROM users WHERE id = $1', [user.userId]);
        if (r.rows.length === 0 || r.rows[0].role !== 'admin') {
          return res.status(503).json({
            error: { message: 'Trwają prace konserwacyjne. Spróbuj ponownie później.', status: 503 },
          });
        }
      }
    } catch (e) {
      // fail-open
    }

    next();
  });
};

const requireAdmin = async (req, res, next) => {
  try {
    const result = await query('SELECT role FROM users WHERE id = $1', [req.user.userId]);
    if (result.rows.length === 0 || result.rows[0].role !== 'admin') {
      return res.status(403).json({
        error: {
          message: 'Brak uprawnień administratora',
          status: 403,
        },
      });
    }
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({
      error: { message: 'Wystąpił błąd podczas weryfikacji uprawnień', status: 500 },
    });
  }
};

module.exports = { authenticateToken, requireAdmin };
