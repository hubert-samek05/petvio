// אימות טוקני זהות של Google ו-Apple מול ספקי הזהות.
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const GOOGLE_CLIENT_IDS = () =>
  (process.env.GOOGLE_CLIENT_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const APPLE_AUDIENCE = () =>
  (process.env.APPLE_AUDIENCE || process.env.APPLE_CLIENT_ID || 'pl.petvio.mobile')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

// Google idToken — אימות מול endpoint הרשמי (tokeninfo) + בדיקת aud מול הרשימה המורשית
const verifyGoogleIdToken = async (idToken) => {
  const r = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
  );
  if (!r.ok) return null;
  const claims = await r.json().catch(() => null);
  if (!claims || claims.error || claims.email_verified !== 'true') return null;
  const allowed = GOOGLE_CLIENT_IDS();
  if (!allowed.length) return null; // bez whitelisty nie wolno przyjąć żadnego aud
  if (!allowed.includes(claims.aud)) return null;
  return {
    providerId: claims.sub,
    email: (claims.email || '').toLowerCase(),
    firstName: claims.given_name || '',
    lastName: claims.family_name || '',
  };
};

// Apple identityToken (JWT מסוג RS256) — מפתחות ציבוריים של appleid.apple.com (JWK)
let appleKeysCache = { at: 0, keys: [] };
const appleKeys = async () => {
  if (Date.now() - appleKeysCache.at < 10 * 60 * 1000 && appleKeysCache.keys.length) {
    return appleKeysCache.keys;
  }
  const r = await fetch('https://appleid.apple.com/auth/keys');
  if (!r.ok) throw new Error('Apple keys fetch failed');
  const { keys } = await r.json();
  appleKeysCache = { at: Date.now(), keys: keys || [] };
  return appleKeysCache.keys;
};

const verifyAppleIdentityToken = async (identityToken) => {
  const decoded = jwt.decode(identityToken, { complete: true });
  if (!decoded || decoded.payload.iss !== 'https://appleid.apple.com') return null;
  const keys = await appleKeys();
  const jwk = keys.find((k) => k.kid === decoded.header.kid);
  if (!jwk) return null;
  const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  const claims = jwt.verify(identityToken, publicKey, {
    algorithms: ['RS256'],
    issuer: 'https://appleid.apple.com',
    audience: APPLE_AUDIENCE(),
  });
  return {
    providerId: claims.sub,
    email: (claims.email || '').toLowerCase(),
    emailVerified: claims.email_verified === true || claims.email_verified === 'true',
  };
};

module.exports = { verifyGoogleIdToken, verifyAppleIdentityToken, GOOGLE_CLIENT_IDS };
