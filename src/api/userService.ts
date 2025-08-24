import { api } from './client';
import { userProfile } from '../data/mockData';

let cachedUserId: string | null = null;

export async function getCurrentUserId(): Promise<string> {
  if (cachedUserId) return cachedUserId; // narrowed to string here
  const users = await api.get<any[]>(`/api/users?name=${encodeURIComponent(userProfile.name)}`);
  const currentUser = users.find(u => String(u.name).toLowerCase() === userProfile.name.toLowerCase()) || users[0];
  if (!currentUser?._id) {
    throw new Error('Could not resolve current user in the database');
  }
  cachedUserId = currentUser._id as string;
  return currentUser._id as string;
}

export function clearCachedUserId() {
  cachedUserId = null;
}

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

export async function getMe(): Promise<MeResponse> {
  return api.get('/api/users/me');
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
