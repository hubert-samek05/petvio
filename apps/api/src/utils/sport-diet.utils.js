const { query } = require('../config/database');

async function getActiveSportDietForPet(petId) {
  const result = await query(
    `SELECT psd.id as assignment_id, psd.pet_id, psd.assigned_at, t.*
     FROM pet_sport_diets psd
     JOIN sport_diet_templates t ON psd.template_id = t.id
     WHERE psd.pet_id = $1 AND psd.is_active = true
     ORDER BY psd.assigned_at DESC
     LIMIT 1`,
    [petId]
  );
  return result.rows[0] || null;
}

function splitKeywords(text) {
  if (!text) return [];
  return text
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function normalizeText(text) {
  return (text || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// Odmiana polskich rzeczowników psie proste dopasowanie substringiem
// („wątroba" nie trafia w „wątroby"). Obcinamy typowe końcówki deklinacyjne.
// Uwaga: słowa są już znormalizowane (bez ogonków) — 'ów' pojawia się jako 'ow'.
const CASE_ENDINGS = ['ami', 'ach', 'em', 'ow', 'om', 'y', 'i', 'e', 'a', 'u', 'o'];
// Słowa nieistotne merytorycznie / zbyt ogólne do samodzielnego ostrzegania.
const STOP_WORDS = new Set([
  'i', 'z', 'ze', 'oraz', 'lub', 'o', 'w', 'na', 'bez', 'do', 'przy', 'dla', 'po', 'od',
  'np', 'tj', 'itd', 'sie', 'się', 'jest', 'są',
]);
const GENERIC_WORDS = new Set([
  'duże', 'duże', 'małe', 'dużych', 'małych', 'ilości', 'wszystko', 'absolutnie',
  'karmy', 'karma', 'karm', 'potrawy', 'potraw', 'resztki', 'przekąski', 'przysmaki',
  'gotowane', 'smażone', 'suszone', 'surowe', 'tłuste', 'ostre', 'nagłe', 'stałe',
  'regularne', 'wysokie', 'niskie', 'świeże', 'świeża', 'dowolny', 'dostęp', 'stołu',
  'zmiany', 'zmiana', 'poza', 'listą', 'smaku', 'smakowe', 'suplementy', 'dużo',
]);

function stemWord(word) {
  const w = normalizeText(word).trim();
  if (w.length <= 4) return w;
  for (const end of CASE_ENDINGS) {
    if (w.endsWith(end) && w.length - end.length >= 4) return w.slice(0, -end.length);
  }
  return w;
}

// Czy pozycja z listy zakazanych składników występuje w znormalizowanym tekście.
// Dopasowujemy całą frazę (ze stem ostatniego słowa) lub dowolne istotne słowo.
function keywordItemMatches(sourceNorm, item) {
  const itemNorm = normalizeText(item);
  const words = itemNorm
    .split(/[^a-z0-9]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
  if (words.length === 0) return false;

  const significant = words.filter((w) => !GENERIC_WORDS.has(w));
  const pool = significant.length > 0 ? significant : words;

  // Każde istotne słowo to osobny zakazany składnik („wątroba i podroby" → ostrzegaj już na samą wątrobę).
  return pool.some((w) => sourceNorm.includes(stemWord(w)));
}

function checkKeywordOverlap(sourceText, keywordsText) {
  const source = normalizeText(sourceText);
  const keywords = splitKeywords(keywordsText);
  return keywords.filter((k) => k && keywordItemMatches(source, k));
}

module.exports = {
  getActiveSportDietForPet,
  splitKeywords,
  normalizeText,
  checkKeywordOverlap,
  keywordItemMatches,
  stemWord,
};
