const axios = require('axios');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Darmowe źródło danych — OpenStreetMap. Bez klucza API i bez billing.
// Uwaga: tylko GLOBALNE mirrory — osm.ch/nchc.org.tw serwuja jedynie regiony
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];
const OSM_USER_AGENT = 'petvio-app/1.0 (petvio.pl)';
// Wymuszone IPv4 — na niektórych hostach IPv6 powoduje timeouty do OSM
const osmAgent = new https.Agent({ family: 4 });

// Cache OBSZAROWY — nie po kluczu lat/lng/radius, tylko po pokryciu.
// Zapytanie jest obslugiwane lokalnie, gdy jego kolo miesci sie w kole
// juz pobranym z Overpass (zmiana suwaka, odswiezenie, maly jitter GPS = 0 ms).
const CACHE_TTL_MS = 10 * 60 * 1000; // swiezy wpis
const CACHE_STALE_MS = 24 * 60 * 60 * 1000; // stale do 24h — lepsze niz pustka
const CACHE_FILE = path.join(require('os').tmpdir(), 'petvio_overpass_cache_v2.json');
// Wersja schematu — zmiana zapytan Overpass uniewaznia stare obszary
const CACHE_SCHEMA = 2;
// type -> [{ at, lat, lng, radius(m), elements }]
const overpassCache = new Map();

const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Cache na dysku — przetrwa restart API
try {
  const raw = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  const now = Date.now();
  Object.entries(raw).forEach(([type, list]) => {
    if (!Array.isArray(list)) return;
    const valid = list.filter((e) => e && e.v === CACHE_SCHEMA && now - e.at < CACHE_STALE_MS);
    if (valid.length) overpassCache.set(type, valid);
  });
  console.log(`Overpass cache: zaladowano ${[...overpassCache.values()].flat().length} obszarow`);
} catch {
  /* brak pliku cache — OK */
}
let cacheSaveTimer = null;
const cacheSave = () => {
  clearTimeout(cacheSaveTimer);
  cacheSaveTimer = setTimeout(() => {
    try {
      fs.writeFileSync(CACHE_FILE, JSON.stringify(Object.fromEntries(overpassCache)));
    } catch {
      /* zapis cache nie jest krytyczny */
    }
  }, 2000);
};

// Czy jakiekolwiek zapisane kolo pokrywa zapytanie (srodek+promien)
const covers = (entry, lat, lng, radiusM) =>
  haversineKm(entry.lat, entry.lng, lat, lng) * 1000 + radiusM <= entry.radius;

// kubelki nadrzedne: 'all' zasila vet/dietitian, 'stays' zasila lodging/petsitter
const CACHE_BUCKETS = {
  veterinary_care: ['veterinary_care', 'all'],
  health: ['health', 'dietitian', 'all'],
  dietitian: ['dietitian', 'health', 'all'],
  lodging: ['lodging', 'stays'],
  hotel: ['lodging', 'stays'],
  petsitter: ['petsitter', 'stays'],
  all: ['all'],
  stays: ['stays'],
};

const cacheLookup = (type, lat, lng, radiusM, maxAge) => {
  const now = Date.now();
  for (const b of CACHE_BUCKETS[type] || [type]) {
    for (const entry of overpassCache.get(b) || []) {
      if (now - entry.at <= maxAge && covers(entry, lat, lng, radiusM)) return entry.elements;
    }
  }
  return null;
};

const cacheAdd = (type, lat, lng, radiusM, elements) => {
  const list = overpassCache.get(type) || [];
  list.push({ at: Date.now(), lat, lng, radius: radiusM, elements, v: CACHE_SCHEMA });
  // pruning: max 25 obszarow na typ, wywal najstarsze/przeterminowane
  const now = Date.now();
  const fresh = list.filter((e) => now - e.at < CACHE_STALE_MS).slice(-25);
  overpassCache.set(type, fresh);
  cacheSave();
};

const buildOverpassQuery = (lat, lng, radius, type) => {
  const area = `(around:${radius},${lat},${lng})`;
  let filters;
  switch (type) {
    case 'health':
    case 'dietitian':
      // Dietetycy / poradnie żywieniowe w OSM
      filters = [`nwr["healthcare"~"nutritionist|dietitian"]${area};`, `nwr["amenity"="dietitian"]${area};`];
      break;
    case 'lodging':
    case 'hotel':
      // Hotele przyjazne zwierzetom + hotele dla zwierzat (animal_boarding)
      filters = [
        `nwr["tourism"~"^(hotel|guest_house|hostel|motel)$"]["pets"~"^(yes|allowed|leashed|designated)$"]${area};`,
        `nwr["amenity"="animal_boarding"]${area};`,
      ];
      break;
    case 'petsitter':
      // OSM prawie nie taguje petsitterow — najblizszy analog: schronisko/opieka
      filters = [`nwr["amenity"="animal_shelter"]${area};`, `nwr["office"~"pet|animal"]${area};`];
      break;
    case 'stays':
      // Hotele dla zwierzat + przyjazne + petsitterzy w JEDNYM zapytaniu
      filters = [
        `nwr["tourism"~"^(hotel|guest_house|hostel|motel)$"]["pets"~"^(yes|allowed|leashed|designated)$"]${area};`,
        `nwr["amenity"~"^(animal_boarding|animal_shelter)$"]${area};`,
        `nwr["office"~"pet|animal"]${area};`,
      ];
      break;
    case 'all':
      // Weterynarze + dietetycy w JEDNYM zapytaniu (polowa obciazenia Overpass)
      filters = [
        `nwr["amenity"~"^(veterinary|animal_hospital)$"]${area};`,
        `nwr["healthcare"~"nutritionist|dietitian"]${area};`,
        `nwr["amenity"="dietitian"]${area};`,
      ];
      break;
    default:
      // Weterynarze
      filters = [`nwr["amenity"~"^(veterinary|animal_hospital)$"]${area};`];
  }
  return `[out:json][timeout:40];\n(${filters.join('\n')});\nout center tags 150;`;
};

const osmAddress = (tags) => {
  const street = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ');
  const city = tags['addr:city'] || tags['addr:town'] || tags['addr:village'] || '';
  return [street, city].filter(Boolean).join(', ');
};

const isOsmVet = (tags) => /^(veterinary|animal_hospital)$/.test(tags.amenity || '');
const isOsmDietitian = (tags) =>
  /^(nutritionist|dietitian)$/.test(tags.healthcare || '') || tags.amenity === 'dietitian';

// ---- Parser opening_hours (format OSM) ----
const OSM_DAY_NUM = { Mo: 1, Tu: 2, We: 3, Th: 4, Fr: 5, Sa: 6, Su: 7 };
const OSM_DAY_PL = { Mo: 'Pon', Tu: 'Wt', We: 'Śr', Th: 'Czw', Fr: 'Pt', Sa: 'Sob', Su: 'Niedz' };
const JS_TO_OSM_DAY = [7, 1, 2, 3, 4, 5, 6]; // getDay(): 0=niedz

const expandDaySelector = (selector) => {
  // 'Mo-Fr' / 'Mo,We,Fr' / 'Sa' -> [1..7]
  const days = new Set();
  selector.split(',').forEach((part) => {
    const m = /^([A-Z][a-z])(?:-([A-Z][a-z]))?$/.exec(part.trim());
    if (!m || !(m[1] in OSM_DAY_NUM)) return;
    const from = OSM_DAY_NUM[m[1]];
    const to = m[2] && m[2] in OSM_DAY_NUM ? OSM_DAY_NUM[m[2]] : from;
    if (from <= to) for (let d = from; d <= to; d++) days.add(d);
    else for (let d = 1; d <= 7; d++) if (d >= from || d <= to) days.add(d);
  });
  return days;
};

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
};

const parseOpeningHours = (raw) => {
  if (!raw || typeof raw !== 'string') return null;
  const src = raw.trim();
  const lines = [];
  const open = new Map(); // osmDay -> [{from,to}] w minutach (to>1440 = przez polnoc)
  const perDayText = new Map(); // osmDay -> tekst godzin albo 'zamknięte'

  if (/24\s*\/\s*7/.test(src)) {
    for (let d = 1; d <= 7; d++) {
      open.set(d, [{ from: 0, to: 24 * 60 }]);
      perDayText.set(d, '00:00–24:00');
    }
    return { lines: ['Całodobowo (24/7)'], open, is247: true, perDayText };
  }

  const rules = src.split(';').map((r) => r.trim()).filter(Boolean);
  rules.forEach((rule) => {
    const closed = /\boff\b|\bclosed\b/i.test(rule);
    // selektor dni = wszystko przed pierwszym czasem HH:MM
    const dayPart = (rule.split(/\d{1,2}:\d{2}/)[0] || '').replace(/\b(off|closed)\b/gi, '').trim();
    const days = dayPart ? expandDaySelector(dayPart) : new Set([1, 2, 3, 4, 5, 6, 7]);
    if (days.size === 0) return;

    const dayLabel =
      days.size === 7 ? 'Codziennie' : dayPart.split(',').map((p) => {
        const m = /^([A-Z][a-z])(?:-([A-Z][a-z]))?$/.exec(p.trim());
        return m ? (m[2] ? `${OSM_DAY_PL[m[1]]}–${OSM_DAY_PL[m[2]]}` : OSM_DAY_PL[m[1]]) : p;
      }).join(', ');

    if (closed) {
      lines.push(`${dayLabel}: zamknięte`);
      days.forEach((d) => perDayText.set(d, 'zamknięte'));
      return;
    }
    const times = (rule.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/g) || []);
    if (times.length === 0) {
      lines.push(rule);
      return;
    }
    const fmt = times.map((t) => t.replace(/\s/g, '').replace('-', '–')).join(', ');
    lines.push(`${dayLabel}: ${fmt}`);
    days.forEach((d) => {
      perDayText.set(d, fmt);
      const spans = times.map((t) => {
        const [a, b] = t.split('-');
        let from = toMinutes(a), to = toMinutes(b);
        if (to <= from) to += 24 * 60; // przekracza polnoc
        return { from, to };
      });
      open.set(d, (open.get(d) || []).concat(spans));
    });
  });

  // wszystkie 7 dni pokryte 00:00-24:00 -> faktycznie całodobowo
  const covered = [1, 2, 3, 4, 5, 6, 7].every((d) =>
    (open.get(d) || []).some((s) => s.from <= 0 && s.to >= 24 * 60)
  );
  if (covered && open.size === 7) {
    return { lines: ['Całodobowo (24/7)'], open, is247: true, perDayText };
  }
  return { lines, open, is247: false, perDayText };
};

// dzien tygodnia OSM (1=Pon..7=Niedz) i minuty — strefa Warszawa
const warsawNow = () => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Warsaw', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t)?.value;
  const wdMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return { day: wdMap[get('weekday')] || 1, now: parseInt(get('hour'), 10) * 60 + parseInt(get('minute'), 10) };
};

const isOpenNowFrom = (parsed) => {
  if (!parsed) return null;
  if (parsed.is247) return true;
  if (parsed.open.size === 0) return null;
  const { day, now } = warsawNow();
  // normalne przedzialy dzisiejszego dnia
  if ((parsed.open.get(day) || []).some((s) => now >= s.from && now < s.to)) return true;
  // kontynuacja nocnego dyżuru z wczoraj (to > 1440)
  const prev = day === 1 ? 7 : day - 1;
  return (parsed.open.get(prev) || []).some((s) => s.to > 24 * 60 && now < s.to - 24 * 60);
};

const todayHoursFrom = (parsed) => {
  if (!parsed || !parsed.perDayText) return null;
  if (parsed.is247) return 'Całodobowo';
  const { day } = warsawNow();
  const t = parsed.perDayText.get(day);
  return t === undefined ? null : t === 'zamknięte' ? 'dziś nieczynne' : `dziś ${t}`;
};

// Zdjecie z tagow OSM (image= URL albo wikimedia_commons=File:...)
const osmPhotoUrl = (tags) => {
  const img = tags.image || tags['contact:image'];
  if (img && /^https?:\/\//i.test(img)) return img;
  const wm = tags.wikimedia_commons;
  if (wm && !/^Category:/i.test(wm)) {
    const fname = wm.replace(/^File:/i, '');
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fname)}?width=800`;
  }
  return null;
};

const mapOsmPlace = (el) => {
  const tags = el.tags || {};
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (lat == null || lng == null) return null;
  const parsed = parseOpeningHours(tags.opening_hours);
  const openingHours = parsed?.lines || null;
  const photo = osmPhotoUrl(tags);
  const isVet = isOsmVet(tags);
  const isDietitian = isOsmDietitian(tags);
  const nameStr = tags.name || '';
  // heurystyka: całodobowosc czesto zapisana tylko w nazwie / tagu emergency
  const name24h = /(24\s*(h|godz)|całodob|calodob)/i.test(nameStr);
  const emergency24h = /^(yes|24\/7)$/i.test(tags.emergency || '') && /24\/?7/i.test(tags['opening_hours:emergency'] || '');
  const fallbackName = isVet
    ? 'Przychodnia weterynaryjna'
    : isDietitian
      ? 'Gabinet dietetyczny'
      : /^(hotel|guest_house|hostel|motel)$/.test(tags.tourism || '')
        ? 'Hotel'
        : 'Placówka';
  return {
    id: `osm_${el.type}_${el.id}`,
    name: nameStr || fallbackName,
    address: osmAddress(tags) || tags['addr:city'] || '',
    location: { lat, lng },
    rating: null,
    userRatingsTotal: null,
    types: isVet ? ['veterinary_care'] : isDietitian ? ['health', 'dietitian'] : [tags.tourism || tags.amenity || 'establishment'],
    openingHours,
    todayHours: todayHoursFrom(parsed),
    isOpenNow: isOpenNowFrom(parsed),
    photos: photo ? [photo] : [],
    businessStatus: 'OPERATIONAL',
    phone: tags.phone || tags['contact:phone'] || null,
    website: tags.website || tags['contact:website'] || tags.url || null,
    is24h: Boolean(parsed?.is247 || name24h || emergency24h),
  };
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Fallback gdy Overpass pada: POI search przez Nominatim (bounded viewbox)
const NOMINATIM_TYPE_MAP = {
  veterinary_care: [
    ['amenity', 'veterinary'],
    ['q', 'weterynarz'],
  ],
  health: [
    ['q', 'dietetyk'],
    ['q', 'nutritionist'],
  ],
  dietitian: [
    ['q', 'dietetyk'],
    ['q', 'nutritionist'],
  ],
  lodging: [
    ['amenity', 'animal_boarding'],
    ['q', 'hotel dla zwierząt'],
  ],
  hotel: [
    ['amenity', 'animal_boarding'],
    ['q', 'hotel dla zwierząt'],
  ],
  petsitter: [
    ['amenity', 'animal_shelter'],
    ['q', 'petsitter'],
  ],
  stays: [
    ['q', 'hotel dla zwierząt'],
    ['amenity', 'animal_boarding'],
    ['amenity', 'animal_shelter'],
    ['q', 'petsitter'],
  ],
  all: [
    ['amenity', 'veterinary'],
    ['q', 'weterynarz'],
    ['q', 'dietetyk'],
  ],
};

const nominatimPoiSearch = async (lat, lng, radiusM, key, value) => {
  const latD = radiusM / 111320;
  const lngD = radiusM / (111320 * Math.max(Math.cos((lat * Math.PI) / 180), 0.1));
  const viewbox = [lng - lngD, lat + latD, lng + lngD, lat - latD].join(',');
  const response = await axios.get('https://nominatim.openstreetmap.org/search', {
    params: {
      format: 'jsonv2',
      bounded: 1,
      viewbox,
      limit: 50,
      addressdetails: 1,
      extratags: 1,
      namedetails: 1,
      'accept-language': 'pl',
      [key]: value,
    },
    headers: { 'User-Agent': OSM_USER_AGENT },
    timeout: 20000,
    httpsAgent: osmAgent,
    proxy: false,
  });
  return Array.isArray(response.data) ? response.data : [];
};

const nominatimToOsmEl = (hit) => ({
  type: hit.osm_type === 'W' ? 'way' : hit.osm_type === 'R' ? 'relation' : 'node',
  id: hit.osm_id,
  lat: parseFloat(hit.lat),
  lon: parseFloat(hit.lon),
  tags: {
    name: hit.namedetails?.name || hit.name || (hit.display_name || '').split(',')[0].trim(),
    // wynik z q= moze nie miec klasy amenity — domyslnie weterynarz
    [hit.class || 'amenity']: hit.type || 'veterinary',
    'addr:street': hit.address?.road,
    'addr:housenumber': hit.address?.house_number,
    'addr:city': hit.address?.city || hit.address?.town || hit.address?.village,
    ...(hit.extratags || {}),
  },
});

const queryNominatimFallback = async (lat, lng, radiusM, type) => {
  const pairs = NOMINATIM_TYPE_MAP[type] || NOMINATIM_TYPE_MAP.veterinary_care;
  const hits = [];
  for (let i = 0; i < pairs.length; i++) {
    const [k, v] = pairs[i];
    try {
      const part = await nominatimPoiSearch(lat, lng, radiusM, k, v);
      hits.push(...part);
    } catch (err) {
      console.error('Nominatim POI fallback failed:', k, v, err.message);
    }
    if (i < pairs.length - 1) await sleep(1100); // polityka Nominatim: ~1 req/s
  }
  // dedupe po osm_id (amenity + q moga zwrocic to samo)
  const seen = new Set();
  return hits
    .filter((h) => {
      const k = `${h.osm_type}_${h.osm_id}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .map(nominatimToOsmEl);
};

// WYSCIG mirrorow: wszystkie zapytania rownolegle, pierwszy sukces wygrywa.
// Timeout 20s na probe — wczesniej 5 mirrorow x 2 metody x 45s = do ~7.5 min!
const overpassAttempt = async (endpoint, method, query) => {
  const opts = {
    headers: { 'User-Agent': OSM_USER_AGENT },
    timeout: 12000,
    httpsAgent: osmAgent,
    proxy: false,
  };
  const response =
    method === 'post'
      ? await axios.post(endpoint, `data=${encodeURIComponent(query)}`, {
          ...opts,
          headers: { ...opts.headers, 'Content-Type': 'application/x-www-form-urlencoded' },
        })
      : await axios.get(endpoint, { ...opts, params: { data: query } });
  if (response.data && Array.isArray(response.data.elements)) {
    return response.data.elements;
  }
  throw new Error('Malformed Overpass response');
};

const queryOverpass = async (query) => {
  // Runda 1: POST na wszystkich mirrorach rownolegle (max ~12s)
  try {
    return await Promise.any(OVERPASS_ENDPOINTS.map((ep) => overpassAttempt(ep, 'post', query)));
  } catch {
    console.error('Overpass: wszystkie POST nieudane, proba GET');
  }
  // Runda 2: GET na wszystkich mirrorach rownolegle (max ~12s)
  try {
    return await Promise.any(OVERPASS_ENDPOINTS.map((ep) => overpassAttempt(ep, 'get', query)));
  } catch (err) {
    console.error('Overpass: wszystkie proby nieudane');
    throw new Error('Overpass unavailable');
  }
};

/**
 * Search for nearby places (veterinary clinics, dietitians) — OpenStreetMap/Overpass
 * GET /api/places/nearby?lat=52.23&lng=21.01&radius=5000&type=veterinary_care|health
 */
exports.nearbySearch = async (req, res) => {
  try {
    const { lat, lng, radius = 5000, type = 'veterinary_care' } = req.query;

    const latN = parseFloat(lat);
    const lngN = parseFloat(lng);
    if (Number.isNaN(latN) || Number.isNaN(lngN) || Math.abs(latN) > 90 || Math.abs(lngN) > 180) {
      return res.status(400).json({ error: { message: 'Nieprawidłowe lub brakujące współrzędne', status: 400 } });
    }
    const radiusN = Math.min(Math.max(parseInt(radius, 10) || 5000, 500), 50000);

    const typeStr = String(type);
    // 1) obsluz lokalnie jesli kolo zapytania miesci sie w pobranym obszarze
    let elements = cacheLookup(typeStr, latN, lngN, radiusN, CACHE_TTL_MS);
    if (!elements) {
      // 2) pobierz z zapasem x2 — suwak promienia i maly jitter trafia potem w to kolo
      const fetchRadius = Math.min(Math.round(radiusN * 2), 50000);
      try {
        elements = await queryOverpass(buildOverpassQuery(latN, lngN, fetchRadius, typeStr));
        cacheAdd(typeStr, latN, lngN, fetchRadius, elements);
      } catch (err) {
        // 3) przeterminowane pokrycie — lepsze niz pustka
        elements = cacheLookup(typeStr, latN, lngN, radiusN, CACHE_STALE_MS);
        if (!elements) {
          console.error('Overpass down, fallback to Nominatim:', err.message);
          elements = await queryNominatimFallback(latN, lngN, radiusN, typeStr);
          cacheAdd(typeStr, latN, lngN, radiusN, elements);
        } else {
          console.error('Overpass down, serving stale cache:', err.message);
        }
      }
    }
    // gdy pokrycie przyszlo z kubelka zbiorczego a pytano o konkretny typ — przefiltruj
    if (typeStr !== 'all' && typeStr !== 'stays') {
      elements = elements.filter((el) => {
        const tags = el.tags || {};
        if (typeStr === 'veterinary_care') return isOsmVet(tags);
        if (typeStr === 'health' || typeStr === 'dietitian') return isOsmDietitian(tags);
        if (typeStr === 'lodging' || typeStr === 'hotel')
          return tags.amenity === 'animal_boarding' || /^(hotel|guest_house|hostel|motel)$/.test(tags.tourism || '');
        if (typeStr === 'petsitter')
          return tags.amenity === 'animal_shelter' || /pet|animal/i.test(tags.office || '');
        return true;
      });
    }
    const radiusKm = radiusN / 1000;
    const places = elements
      .map(mapOsmPlace)
      .filter(Boolean)
      .filter((p) => haversineKm(latN, lngN, p.location.lat, p.location.lng) <= radiusKm + 0.1)
      .sort(
        (a, b) =>
          haversineKm(latN, lngN, a.location.lat, a.location.lng) -
          haversineKm(latN, lngN, b.location.lat, b.location.lng)
      );

    return res.json({ places, usingMockData: false });
  } catch (error) {
    console.error('Error in nearbySearch:', error.message);
    return res.status(502).json({
      error: { message: 'Nie udało się pobrać placówek (OpenStreetMap). Spróbuj ponownie za chwilę.', status: 502 },
    });
  }
};
/**
 * Geocode an address to coordinates — OpenStreetMap Nominatim (free, no key)
 * GET /api/places/geocode?address=Warszawa
 */
exports.geocode = async (req, res) => {
  try {
    const { address } = req.query;
    if (!address || !String(address).trim()) {
      return res.status(400).json({ error: { message: 'Adres jest wymagany', status: 400 } });
    }

    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: String(address).slice(0, 200),
        format: 'json',
        limit: 1,
        'accept-language': 'pl',
        countrycodes: 'pl',
      },
      headers: { 'User-Agent': OSM_USER_AGENT },
      timeout: 15000,
      httpsAgent: osmAgent,
      proxy: false,
    });

    if (Array.isArray(response.data) && response.data.length > 0) {
      const hit = response.data[0];
      return res.json({
        lat: parseFloat(hit.lat),
        lng: parseFloat(hit.lon),
        formattedAddress: hit.display_name,
      });
    }
    return res.status(404).json({ error: { message: 'Nie znaleziono lokalizacji', status: 404 } });
  } catch (error) {
    console.error('Geocode error:', error.message);
    return res.status(502).json({ error: { message: 'Błąd geokodowania', status: 502 } });
  }
};

/**
 * Autocomplete / wyszukiwanie lokalizacji — OSM Nominatim.
 * Zwraca kształt kompatybilny z dawnym Google Places autocomplete.
 * GET /api/places/autocomplete?input=Warszawa
 */
exports.autocomplete = async (req, res) => {
  try {
    const { input } = req.query;
    if (!input || !String(input).trim()) {
      return res.status(400).json({ error: { message: 'Input query is required', status: 400 } });
    }

    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: String(input).slice(0, 200),
        format: 'json',
        limit: 5,
        'accept-language': 'pl',
        countrycodes: 'pl',
      },
      headers: { 'User-Agent': OSM_USER_AGENT },
      timeout: 15000,
      httpsAgent: osmAgent,
      proxy: false,
    });

    const predictions = (response.data || []).map((hit) => ({
      placeId: `osm|${hit.lat}|${hit.lon}`,
      description: hit.display_name,
      lat: parseFloat(hit.lat),
      lng: parseFloat(hit.lon),
    }));

    return res.json({ predictions });
  } catch (error) {
    console.error('Autocomplete error:', error.message);
    return res.json({ predictions: [] });
  }
};

/**
 * Szczegóły miejsca — dla wyników Nominatim placeId ma postać osm|lat|lng.
 * GET /api/places/details/:placeId
 */
exports.getPlaceDetails = async (req, res) => {
  try {
    const { placeId } = req.params;
    const m = /^osm\|(-?\d+\.?\d*)\|(-?\d+\.?\d*)$/.exec(placeId || '');
    if (!m) {
      return res.status(400).json({ error: { message: 'Nieprawidłowy placeId', status: 400 } });
    }
    const lat = parseFloat(m[1]);
    const lng = parseFloat(m[2]);
    return res.json({
      id: placeId,
      location: { lat, lng },
      geometry: { location: { lat, lng } },
      data: { geometry: { location: { lat, lng } } },
    });
  } catch (error) {
    console.error('Place details error:', error.message);
    return res.status(500).json({ error: { message: 'Nie udało się pobrać szczegółów', status: 500 } });
  }
};
