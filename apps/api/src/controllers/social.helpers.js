// Wspólne helpery dla kontrolerów social (posty tablicy i grup)
const MAX_IMAGES = 4;
const MAX_IMAGE_LEN = 2_000_000; // ~1.5MB base64
const MAX_VIDEO_LEN = 7_000_000; // ~5.2MB base64
const MAX_WALK_POINTS = 200;

const VALID_REACTIONS = ['like', 'love', 'haha', 'wow', 'sad'];

const fullName = (r) => `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'Użytkownik';

const downsamplePoints = (points) => {
  if (!Array.isArray(points)) return [];
  const clean = points
    .filter((p) => p && typeof p.lat === 'number' && typeof p.lng === 'number')
    .map((p) => ({ lat: p.lat, lng: p.lng }));
  if (clean.length <= MAX_WALK_POINTS) return clean;
  const step = clean.length / MAX_WALK_POINTS;
  const out = [];
  for (let i = 0; i < clean.length; i += step) out.push(clean[Math.floor(i)]);
  if (out[out.length - 1] !== clean[clean.length - 1]) out.push(clean[clean.length - 1]);
  return out;
};

const walkFromRow = (r) => {
  if (!r.walk_id) return null;
  return {
    id: String(r.walk_id),
    petName: r.pet_name || null,
    startedAt: r.walk_started_at,
    durationSeconds: Number(r.walk_duration || 0),
    distanceMeters: Number(r.walk_distance || 0),
    points: downsamplePoints(r.walk_points),
  };
};

const WALK_SELECT = `
         w.id AS walk_id, w.started_at AS walk_started_at,
         w.duration_seconds AS walk_duration, w.distance_meters AS walk_distance,
         w.points AS walk_points, pet.name AS pet_name`;

const WALK_JOIN = `
  LEFT JOIN walks w ON w.id = p.walk_id
  LEFT JOIN pets pet ON pet.id = w.pet_id`;

const sanitizeImages = (images) => {
  if (!Array.isArray(images)) return [];
  return images
    .filter((i) => typeof i === 'string' && i.startsWith('data:image/'))
    .slice(0, MAX_IMAGES)
    .map((i) => i.slice(0, MAX_IMAGE_LEN));
};

const sanitizeVideo = (video) =>
  typeof video === 'string' && video.startsWith('data:video/') ? video.slice(0, MAX_VIDEO_LEN) : null;

const sanitizeMusic = (music) => {
  if (!music || typeof music !== 'object') return null;
  const title = String(music.title || '').trim().slice(0, 120);
  const artist = String(music.artist || '').trim().slice(0, 120);
  const url = typeof music.url === 'string' && /^https?:\/\//i.test(music.url) ? music.url.slice(0, 500) : '';
  if (!title && !artist) return null;
  return { title, artist, url };
};

const commentRow = (r) => ({
  id: String(r.id),
  authorId: String(r.user_id),
  authorName: fullName(r),
  authorAvatar: r.avatar_url || null,
  content: r.content,
  createdAt: r.created_at,
});

module.exports = {
  MAX_IMAGES,
  MAX_IMAGE_LEN,
  MAX_VIDEO_LEN,
  VALID_REACTIONS,
  fullName,
  downsamplePoints,
  walkFromRow,
  WALK_SELECT,
  WALK_JOIN,
  sanitizeImages,
  sanitizeVideo,
  sanitizeMusic,
  commentRow,
};
