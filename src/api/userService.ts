import { api } from './client';

// Remove mock data dependency - use real authentication

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  avatar?: string;
}

export async function updateUserProfile(userId: string, data: UpdateUserPayload) {
  return api.put(`/api/users/${encodeURIComponent(userId)}`, data);
}

// New: get current authenticated user
export type MeResponse = {
  _id: string;
  name: string;
  email?: string;
  avatar?: string;
  // community may be a string ObjectId or a populated object
  community?: string | { _id: string; name?: string } | null;
  rating?: number;
  isProfileComplete?: boolean;
};

// Lightweight in-memory cache for /api/users/me
let cachedMe: MeResponse | null = null;
let cachedAt = 0;
let inflight: Promise<MeResponse> | null = null;

export function clearCachedUserId() {
  cachedMe = null;
  cachedAt = 0;
  inflight = null;
}

export async function getMe(ttlMs: number = 30000): Promise<MeResponse> {
  const now = Date.now();
  if (cachedMe && now - cachedAt < ttlMs) return cachedMe;
  if (inflight) return inflight;
  inflight = api.get<MeResponse>('/api/users/me')
    .then((res) => {
      cachedMe = res;
      cachedAt = Date.now();
      return res;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export async function getMyContext(): Promise<{ userId: string; communityId?: string }> {
  const me = await getMe();
  const userId = me?._id;
  let communityId = typeof me?.community === 'string'
    ? me.community
    : (me?.community && (me.community as any)._id) || undefined;

  // Auto-assign a default community if missing
  if (userId && !communityId) {
    const communities = await api.get<any[]>('/api/communities');
    const first = Array.isArray(communities) && communities.length ? communities[0] : null;
    if (first?._id) {
      await updateUserProfile(userId, { community: first._id } as any);
      communityId = first._id as string;
    }
  }

  return { userId, communityId };
}
