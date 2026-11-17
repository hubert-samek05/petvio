import * as maplibregl from 'maplibre-gl';

// OpenFreeMap — darmowe wektorowe kafelki (OpenMapTiles), bez klucza API.
// Styl "liberty": kolorowe POI, czytelne etykiety, profesjonalny wygląd.
export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

// maplibre-gl v6 + webpack/Next: worker MUSI byc wskazany jawnie, inaczej
// mapa renderuje puste tlo (znany bug — import.meta.url nie trafia na worker).
// UWAGA: przy aktualizacji maplibre-gl skopiuj na nowo:
//   node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs → public/
if (typeof window !== 'undefined') {
  maplibregl.setWorkerUrl('/maplibre-gl-worker.mjs');
}

// Budynki 3D — warstwa fill-extrusion na danych OpenMapTiles
export function add3dBuildings(map: maplibregl.Map) {
  try {
    const layers = map.getStyle().layers || [];
    // wstawiamy pod warstwami etykiet, zeby napisy zostaly na wierzchu
    const labelLayer = layers.find(
      (l) => l.type === 'symbol' && (l as any).layout?.['text-field']
    );
    map.addLayer(
      {
        id: 'pv-3d-buildings',
        source: 'openmaptiles',
        'source-layer': 'building',
        type: 'fill-extrusion',
        minzoom: 14.5,
        paint: {
          'fill-extrusion-color': '#e3ded8',
          'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 10],
          'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
          'fill-extrusion-opacity': 0.85,
        },
      },
      labelLayer?.id
    );
  } catch {
    // styl bez warstwy building — po prostu pomijamy 3D
  }
}
