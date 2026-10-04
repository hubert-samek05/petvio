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

function checkKeywordOverlap(sourceText, keywordsText) {
  const source = normalizeText(sourceText);
  const keywords = splitKeywords(keywordsText).map(normalizeText);
  return keywords.filter((k) => k && source.includes(k));
}

module.exports = {
  getActiveSportDietForPet,
  splitKeywords,
  normalizeText,
  checkKeywordOverlap,
};
