const { query } = require('../config/database');

async function getActiveBarfPlanForPet(petId) {
  const result = await query(
    `SELECT * FROM barf_plans WHERE pet_id = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1`,
    [petId]
  );
  return result.rows[0] || null;
}

module.exports = {
  getActiveBarfPlanForPet,
};
