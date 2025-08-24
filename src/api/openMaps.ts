// OpenStreetMap Nominatim search + simple Haversine distance
// Free, rate-limited; include a proper User-Agent per Nominatim usage policy.

export interface OSMPlaceResult {
  id: string;
  name: string;
  displayName: string;
  lat: number;
  lon: number;
}

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

export async function searchPlacesNominatim(query: string, limit = 6, countryCodes?: string[]): Promise<OSMPlaceResult[]> {
  const q = query.trim();
  if (!q) return [];

  const url = new URL(`${NOMINATIM_BASE}/search`);
  url.searchParams.set('q', q);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', String(limit));
  if (countryCodes && countryCodes.length) {
    url.searchParams.set('countrycodes', countryCodes.join(','));
  }

  const res = await fetch(url.toString(), {
    headers: {
      // Please customize to your contact address or domain.
      'User-Agent': 'DewCarpooling/1.0 (contact: support@dew.app)',
      'Accept': 'application/json',
      'Referer': 'https://dew.app',
    },
  });
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.map((item: any) => ({
    id: String(item.place_id),
    name: item.name || item.display_name?.split(',')[0] || 'Unknown',
    displayName: item.display_name,
    lat: parseFloat(item.lat),
    lon: parseFloat(item.lon),
  }));
}

export function haversineDistanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371; // km
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

function toRad(deg: number): number { return (deg * Math.PI) / 180; }
