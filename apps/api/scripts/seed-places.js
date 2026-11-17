/**
 * Seed: prawdziwe hotele dla zwierząt / pet-friendly z OpenStreetMap (cała Polska).
 * Wstawia do tabeli `specialists` ze statusem 'approved' — od razu widoczne.
 * Uruchom: node scripts/seed-places.js
 */
const axios = require('axios');
const https = require('https');
const db = require('../src/config/database');

const UA = 'petvio-app/1.0 (petvio.pl) — seed POI';
const agent = new https.Agent({ family: 4 });
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

// bbox Polski
const PL_BBOX = '49.0,14.0,55.0,24.5';

const QUERY = `[out:json][timeout:120];
(
  nwr["amenity"="animal_boarding"](${PL_BBOX});
  nwr["tourism"~"^(hotel|guest_house|hostel|motel)$"]["pets"~"^(yes|allowed|leashed|designated)$"](${PL_BBOX});
);
out center tags 500;`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchOverpass() {
  for (const ep of ENDPOINTS) {
    try {
      const res = await axios.post(ep, `data=${encodeURIComponent(QUERY)}`, {
        headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 120000,
        httpsAgent: agent,
        proxy: false,
      });
      if (res.data?.elements) return res.data.elements;
    } catch (e) {
      console.error(`Overpass ${ep} failed: ${e.message}`);
    }
    await sleep(2000);
  }
  throw new Error('Wszystkie mirrory Overpass nieudane');
}

const norm = (s) => (s || '').toLowerCase().replace(/[^a-ząćęłńóśźż0-9]/g, '');

const osmAddress = (tags) => {
  const street = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ');
  return street || null;
};
const osmCity = (tags) =>
  tags['addr:city'] || tags['addr:town'] || tags['addr:village'] || tags['addr:municipality'] || null;

async function main() {
  console.log('Pobieram POI z Overpass (cała Polska)...');
  const elements = await fetchOverpass();
  console.log(`Overpass zwrócił ${elements.length} elementów`);

  // istniejące wpisy — dedupe po nazwie+mieście
  const existing = await db.query(
    "SELECT name, city FROM specialists WHERE specialist_type IN ('hotel','petsitter')"
  );
  const existingKeys = new Set(existing.rows.map((r) => `${norm(r.name)}|${norm(r.city)}`));

  // dedupe wewnętrzne (nwr może dać way+node tego samego obiektu)
  const seen = new Set();
  let inserted = 0, skippedNoName = 0, skippedDup = 0;

  for (const el of elements) {
    const tags = el.tags || {};
    const name = tags.name || tags['brand'] || '';
    if (!name.trim()) { skippedNoName++; continue; }

    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (lat == null || lng == null) continue;

    const city = osmCity(tags) || '';
    const key = `${norm(name)}|${Math.round(lat * 100)}|${Math.round(lng * 100)}`;
    if (seen.has(key)) { skippedDup++; continue; }
    seen.add(key);
    if (existingKeys.has(`${norm(name)}|${norm(city)}`)) { skippedDup++; continue; }

    const isBoarding = tags.amenity === 'animal_boarding';
    const type = 'hotel'; // animal_boarding + pet-friendly hotele -> kategoria „hotel dla zwierząt"
    const description = isBoarding
      ? 'Hotel dla zwierząt (dane: OpenStreetMap)'
      : 'Obiekt noclegowy przyjazny zwierzętom (dane: OpenStreetMap)';

    await db.query(
      `INSERT INTO specialists
        (name, specialist_type, species, description, phone, email, website, city, address,
         latitude, longitude, price_info, status, submitted_by, created_at, updated_at)
       VALUES ($1,$2,'both',$3,$4,$5,$6,$7,$8,$9,$10,NULL,'approved',NULL,NOW(),NOW())`,
      [
        name.trim().slice(0, 255),
        type,
        description,
        (tags.phone || tags['contact:phone'] || '').slice(0, 30) || null,
        (tags.email || tags['contact:email'] || '').slice(0, 255) || null,
        (tags.website || tags['contact:website'] || tags.url || '').slice(0, 255) || null,
        city.slice(0, 100) || 'Polska',
        osmAddress(tags)?.slice(0, 255),
        lat,
        lng,
      ]
    );
    inserted++;
  }

  const total = await db.query(
    "SELECT count(*) FROM specialists WHERE specialist_type IN ('hotel','petsitter')"
  );
  console.log(`\n✅ Wstawiono: ${inserted} | pominięto bez nazwy: ${skippedNoName} | duplikaty: ${skippedDup}`);
  console.log(`Razem hoteli/petsitterów w bazie: ${total.rows[0].count}`);
  process.exit(0);
}

main().catch((e) => {
  console.error('SEED FAILED:', e.message);
  process.exit(1);
});
