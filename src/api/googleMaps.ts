import Constants from 'expo-constants';

const API_BASE = 'https://maps.googleapis.com/maps/api';

function getApiKey(): string {
  const extra = (Constants?.expoConfig as any)?.extra || (Constants?.manifest as any)?.extra;
  const key = extra?.googleMapsApiKey || process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    throw new Error('Missing Google Maps API key. Set expo.extra.googleMapsApiKey in app.json or GOOGLE_MAPS_API_KEY env.');
  }
  return key;
}

export interface PlacePrediction {
  description: string;
  place_id: string;
  structured_formatting?: { main_text?: string; secondary_text?: string };
}

export interface PlaceDetailsResult {
  place_id: string;
  name: string;
  formatted_address: string;
  location: { lat: number; lng: number };
}

export async function autocompletePlaces(input: string, sessionToken?: string): Promise<PlacePrediction[]> {
  if (!input?.trim()) return [];
  const key = getApiKey();
  const url = new URL(`${API_BASE}/place/autocomplete/json`);
  url.searchParams.set('key', key);
  url.searchParams.set('input', input);
  // Note: Removing restrictive filters to broaden results while debugging.
  // If you need to limit later, consider 'components=country:in' or 'types=geocode'.
  if (sessionToken) url.searchParams.set('sessiontoken', sessionToken);

  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.status !== 'OK') {
    console.warn('[Google Places Autocomplete] non-OK', { status: data.status, error_message: data.error_message });
    return [];
  }
  return data.predictions as PlacePrediction[];
}

export async function getPlaceDetails(placeId: string, sessionToken?: string): Promise<PlaceDetailsResult | null> {
  const key = getApiKey();
  const url = new URL(`${API_BASE}/place/details/json`);
  url.searchParams.set('key', key);
  url.searchParams.set('place_id', placeId);
  url.searchParams.set('fields', 'place_id,name,formatted_address,geometry/location');
  if (sessionToken) url.searchParams.set('sessiontoken', sessionToken);

  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.status !== 'OK') {
    console.warn('[Google Place Details] non-OK', { status: data.status, error_message: data.error_message });
    return null;
  }
  const r = data.result;
  return {
    place_id: r.place_id,
    name: r.name,
    formatted_address: r.formatted_address,
    location: { lat: r.geometry.location.lat, lng: r.geometry.location.lng },
  };
}

export interface DistanceMatrixResult {
  distanceMeters: number;
  distanceText: string;
  durationSeconds: number;
  durationText: string;
}

export async function getDrivingDistance(origin: { lat: number; lng: number }, dest: { lat: number; lng: number }): Promise<DistanceMatrixResult | null> {
  const key = getApiKey();
  const url = new URL(`${API_BASE}/distancematrix/json`);
  url.searchParams.set('key', key);
  url.searchParams.set('origins', `${origin.lat},${origin.lng}`);
  url.searchParams.set('destinations', `${dest.lat},${dest.lng}`);
  url.searchParams.set('mode', 'driving');

  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.status !== 'OK') {
    console.warn('[Google Distance Matrix] non-OK', { status: data.status, error_message: data.error_message });
    return null;
  }
  const element = data.rows?.[0]?.elements?.[0];
  if (!element || element.status !== 'OK') {
    console.warn('[Google Distance Matrix] element non-OK', { elementStatus: element?.status });
    return null;
  }
  return {
    distanceMeters: element.distance.value,
    distanceText: element.distance.text,
    durationSeconds: element.duration.value,
    durationText: element.duration.text,
  };
}
