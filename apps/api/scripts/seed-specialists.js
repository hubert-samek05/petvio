/**
 * Seed Overture Maps: trenerzy psow + groomerzy w Polsce -> specialists
 * Dane: /tmp/overture_spec.json
 */
const db = require('../src/config/database');
const data = require('/tmp/overture_spec.json');

const TAX = {
  dog_trainer: { type: 'trainer', desc: 'Trener / szkoła dla psów' },
  pet_groomer: { type: 'groomer', desc: 'Groomer — fryzjer dla zwierząt' },
};

const norm = (s) => (s || '').toLowerCase().replace(/[^a-ząćęłńóśźż0-9]/g, '');

async function main() {
  const existing = await db.query("SELECT name, city FROM specialists");
  const existingKeys = new Set(existing.rows.map((r) => `${norm(r.name)}|${norm(r.city)}`));
  const seen = new Set();
  let inserted = 0, dup = 0;
  for (const p of data) {
    const m = TAX[p.tax];
    if (!m || !p.name || p.lat == null || p.lng == null) continue;
    const city = (p.city || 'Polska').replace(/ \(Gmina\)$/, '');
    const key = `${norm(p.name)}|${Math.round(p.lat * 100)}|${Math.round(p.lng * 100)}`;
    if (seen.has(key) || existingKeys.has(`${norm(p.name)}|${norm(city)}`)) { dup++; continue; }
    seen.add(key);
    await db.query(
      `INSERT INTO specialists
        (name, specialist_type, species, description, phone, email, website, city, address,
         latitude, longitude, price_info, status, submitted_by, created_at, updated_at)
       VALUES ($1,$2,'both',$3,$4,$5,$6,$7,$8,$9,$10,NULL,'approved',NULL,NOW(),NOW())`,
      [
        p.name.slice(0, 255), m.type,
        `${m.desc} (źródło: Overture Maps)`,
        (p.phone || '').slice(0, 30) || null,
        (p.email || '').slice(0, 255) || null,
        (p.website || '').slice(0, 255) || null,
        city.slice(0, 100),
        (p.street || '').slice(0, 255) || null,
        p.lat, p.lng,
      ]
    );
    inserted++;
  }
  const t = await db.query("SELECT specialist_type,count(*) FROM specialists GROUP BY 1 ORDER BY 2 DESC");
  console.log(`✅ wstawiono ${inserted} | dup ${dup}`);
  console.log(JSON.stringify(t.rows));
  process.exit(0);
}
main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
