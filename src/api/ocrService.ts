import { BASE_URL } from '../config';
import { getAuthHeader, ApiError } from './client';
import { parseIndiaDL, type IndiaDLParsed } from '../utils/indiaDlParser';

export type OcrResponse = { text: string };

export async function uploadLicenseImageAndParse(fileUri: string, filename = 'license.jpg'): Promise<{ rawText: string; parsed: IndiaDLParsed }>
{
  const form = new FormData();
  // In Expo/React Native, FormData file requires { uri, name, type }
  const imagePart: any = { uri: fileUri as any, name: filename, type: 'image/jpeg' };
  // Cast to any to satisfy TS, React Native's FormData supports this shape at runtime
  form.append('image' as any, imagePart as any);

  const res = await fetch(`${BASE_URL}/api/ocr/license`, {
    method: 'POST',
    headers: {
      ...getAuthHeader(),
    },
    body: form,
  });

  const raw = await res.text();
  let data: any = undefined;
  if (raw) {
    try { data = JSON.parse(raw); } catch { data = { text: raw }; }
  }

  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `HTTP ${res.status}`;
    throw new ApiError(msg, res.status, data);
  }

  const text = (data?.text as string) || '';
  const parsed = parseIndiaDL(text);
  return { rawText: text, parsed };
}
