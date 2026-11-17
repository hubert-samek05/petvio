/**
 * Seed Overture Maps: weterynarze/kliniki weterynaryjne w Polsce -> specialists(type='vet')
 * Dane: /tmp/overture_vets.json
 * Uruchom: node scripts/seed-vets.js
 */
const db = require('../src/config/database');
const data = require('/tmp/overture_vets.json');

const DESC = {
  veterinarian: 'Weterynarz (źródło: Overture Maps)',
  veterinary_care: 'Opieka weterynaryjna (źródło: Overture Maps)',
  animal_hospital: 'Szpital dla zwierząt (źródło: Overture Maps)',
};

const norm = (s) => (s || '').toLowerCase().replace(/[^a-ząćęłńóśźż0-9]/g, '');

async function main() {
  const existing = await db.query("SELECT name, city FROM specialists WHERE specialist_type IN ('hotel','petsitter','vet')");
  const existingKeys = new Set(existing.rows.map((r) => `${norm(r.name)}|${norm(r.city)}`));
  const seen = new Set();
  let inserted = 0, dup = 0;

  for (const p of data) {
    if (!p.name || p.lat == null || p.lng == null) continue;
    const city = (p.city || 'Polska').replace(/ \(Gmina\)$/, '');
    const key = `${norm(p.name)}|${Math.round(p.lat * 100)}|${Math.round(p.lng * 100)}`;
    if (seen.has(key) || existingKeys.has(`${norm(p.name)}|${norm(city)}`)) { dup++; continue; }
    seen.add(key);
    await db.query(
      `INSERT INTO specialists
        (name, specialist_type, species, description, phone, email, website, city, address,
         latitude, longitude, price_info, status, submitted_by, created_at, updated_at)
       VALUES ($1,'vet','both',$2,$3,$4,$5,$6,$7,$8,$9,NULL,'approved',NULL,NOW(),NOW())`,
      [
        p.name.slice(0, 255),
        DESC[p.tax] || DESC.veterinarian,
        (p.phone || '').slice(0, 30) || null,
        (p.email || '').slice(0, 255) || null,
        (p.website || '').slice(0, 255) || null,
        city.slice(0, 100),
        (p.street || '').slice(0, 255) || null,
        p.lat,
        p.lng,
      ]
    );
    inserted++;
  }
  const t = await db.query("SELECT count(*) FROM specialists WHERE specialist_type='vet'");
  console.log(`✅ wstawiono ${inserted} | duplikaty ${dup} | razem vet: ${t.rows[0].count}`);
  process.exit(0);
}
main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
