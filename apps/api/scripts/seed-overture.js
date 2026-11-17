/**
 * Seed Overture Maps (CDLA-Permissive): hotele dla zwierzat + petsitterzy w Polsce.
 * Dane: /tmp/overture_pets.json (wyciagniete DuckDB z release 2026-10-21.0)
 * Uruchom: node scripts/seed-overture.js
 */
const db = require('../src/config/database');
const data = require('/tmp/overture_pets.json');

const TAX_MAP = {
  pet_boarding: { type: 'hotel', desc: 'Hotel dla zwierząt' },
  pet_sitting: { type: 'petsitter', desc: 'Petsitter — opieka nad zwierzętami' },
  pet_care_service: { type: 'petsitter', desc: 'Opieka nad zwierzętami' },
  dog_walker: { type: 'petsitter', desc: 'Wyprowadzanie psów' },
  animal_or_pet_service: { type: 'petsitter', desc: 'Usługi dla zwierząt' },
  animal_shelter: { type: 'petsitter', desc: 'Schronisko dla zwierząt' },
  animal_rescue_service: { type: 'petsitter', desc: 'Ratownictwo zwierzęce' },
};

const norm = (s) => (s || '').toLowerCase().replace(/[^a-ząćęłńóśźż0-9]/g, '');

async function main() {
  const existing = await db.query(
    "SELECT name, city FROM specialists WHERE specialist_type IN ('hotel','petsitter')"
  );
  const existingKeys = new Set(existing.rows.map((r) => `${norm(r.name)}|${norm(r.city)}`));
  const seen = new Set();

  let inserted = 0, dup = 0;
  for (const p of data) {
    const m = TAX_MAP[p.tax];
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
        p.name.slice(0, 255),
        m.type,
        `${m.desc} (źródło: Overture Maps)`,
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

  const t = await db.query(
    "SELECT specialist_type, count(*) FROM specialists WHERE specialist_type IN ('hotel','petsitter') GROUP BY 1"
  );
  console.log(`✅ wstawiono ${inserted} | duplikaty ${dup}`);
  console.log('STAN:', JSON.stringify(t.rows));
  process.exit(0);
}

main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
