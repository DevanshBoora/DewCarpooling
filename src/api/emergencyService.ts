import { api } from './client';

export type EmergencyType = 'sos' | 'panic' | 'medical' | 'accident' | 'harassment';

export interface TriggerSOSPayload {
  type: EmergencyType;
  location: {
    latitude: number;
    longitude: number;
  };
  address?: string;
  message?: string;
  rideId?: string;
}

export interface TriggerSOSResponse {
  emergencyId: string;
  message: string;
  trustedContactsNotified: number;
  location: {
    latitude: number;
    longitude: number;
  };
  timestamp: string;
}

export interface ResolveEmergencyPayload {
  emergencyId: string;
  status?: 'resolved' | 'false_alarm';
  notes?: string;
}

export interface Emergency {
  _id: string;
  user: string;
  ride?: string;
  type: EmergencyType;
  status: 'active' | 'resolved' | 'false_alarm';
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  address?: string;
  message?: string;
  trustedContactsNotified: boolean;
  emergencyServicesNotified: boolean;
  responseTime?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrustedContact {
  _id: string;
  user: string;
  name: string;
  phone: string;
  email?: string;
  relationship: 'family' | 'friend' | 'colleague' | 'emergency_contact';
  isPrimary: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AddTrustedContactPayload {
  name: string;
  phone: string;
  email?: string;
  relationship: 'family' | 'friend' | 'colleague' | 'emergency_contact';
  isPrimary?: boolean;
}

export interface VerifyTrustedContactPayload {
  code: string;
}

// Emergency API calls
export const triggerSOS = (payload: TriggerSOSPayload) =>
  api.post<TriggerSOSResponse>('/api/emergency/sos', payload);

export const resolveEmergency = (payload: ResolveEmergencyPayload) =>
  api.post('/api/emergency/resolve', payload);

export const getEmergencyHistory = () =>
  api.get<Emergency[]>('/api/emergency/history');

export const getActiveEmergencies = () =>
  api.get<Emergency[]>('/api/emergency/active');

// Trusted Contacts API calls
export const addTrustedContact = (payload: AddTrustedContactPayload) =>
  api.post<TrustedContact>('/api/trusted-contacts', payload);

export const getTrustedContacts = () =>
  api.get<TrustedContact[]>('/api/trusted-contacts');

export const verifyTrustedContact = (contactId: string, payload: VerifyTrustedContactPayload) =>
  api.post(`/api/trusted-contacts/${contactId}/verify`, payload);

export const resendVerification = (contactId: string) =>
  api.post(`/api/trusted-contacts/${contactId}/resend-verification`);

export const deleteTrustedContact = (contactId: string) =>
  api.del(`/api/trusted-contacts/${contactId}`);
