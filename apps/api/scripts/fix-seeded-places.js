/**
 * Fixup dla seedu: reverse-geocoding (Nominatim) — uzupelnia prawdziwe miasto
 * i usuwa wpisy spoza Polski (bbox wsysal przygraniczne Czechy/Niemcy).
 * Uruchom: node scripts/fix-seeded-places.js
 */
const axios = require('axios');
const https = require('https');
const db = require('../src/config/database');

const UA = 'petvio-app/1.0 (petvio.pl) — city fixup';
const agent = new https.Agent({ family: 4 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function reverseGeocode(lat, lng) {
  const res = await axios.get('https://nominatim.openstreetmap.org/reverse', {
    params: {
      format: 'jsonv2',
      lat,
      lon: lng,
      'accept-language': 'pl',
      zoom: 10, // poziom miasta
      addressdetails: 1,
    },
    headers: { 'User-Agent': UA },
    timeout: 15000,
    httpsAgent: agent,
    proxy: false,
  });
  return res.data;
}

async function main() {
  const rows = await db.query(
    "SELECT id, name, city, latitude, longitude FROM specialists WHERE specialist_type IN ('hotel','petsitter') AND submitted_by IS NULL"
  );
  console.log(`Do sprawdzenia: ${rows.rows.length} wpisow`);

  let updated = 0, deleted = 0, failed = 0;
  for (const r of rows.rows) {
    try {
      const geo = await reverseGeocode(r.latitude, r.longitude);
      const cc = geo?.address?.country_code;
      if (cc && cc !== 'pl') {
        await db.query('DELETE FROM specialists WHERE id = $1', [r.id]);
        console.log(`  DELETE ${r.name} — ${geo.address.country} (${cc})`);
        deleted++;
      } else {
        const city =
          geo?.address?.city ||
          geo?.address?.town ||
          geo?.address?.village ||
          geo?.address?.municipality ||
          geo?.address?.county ||
          r.city;
        if (city !== r.city) {
          await db.query('UPDATE specialists SET city = $1 WHERE id = $2', [city, r.id]);
          updated++;
        }
      }
    } catch (e) {
      failed++;
      console.log(`  FAIL ${r.name}: ${e.message}`);
    }
    await sleep(1100); // polityka Nominatim: ~1 req/s
  }

  const total = await db.query(
    "SELECT count(*) FROM specialists WHERE specialist_type IN ('hotel','petsitter')"
  );
  console.log(`\n✅ zaktualizowano miasta: ${updated} | usunieto spoza PL: ${deleted} | bledy: ${failed}`);
  console.log(`Razem w bazie: ${total.rows[0].count}`);
  process.exit(0);
}

main().catch((e) => {
  console.error('FIXUP FAILED:', e.message);
  process.exit(1);
});
