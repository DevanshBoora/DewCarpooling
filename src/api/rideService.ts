import { api } from './client';

export interface RideLocation {
  name: string;
  address: string;
  coordinates: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
}

export interface Ride {
  _id: string;
  owner: { _id: string; name: string; avatar?: string };
  community: string;
  pickupLocation: RideLocation;
  dropoffLocation: RideLocation;
  departureTime: string;
  status: 'active' | 'completed' | 'cancelled';
  participants: string[];
  capacity: number;
  price: number;
  notes?: string;
}

export interface CreateRidePayload {
  owner: string;
  community: string;
  pickupLocation: RideLocation;
  dropoffLocation: RideLocation;
  departureTime: string; // ISO
  capacity: number;
  price: number;
  notes?: string;
}

export const listRides = async (communityId: string): Promise<Ride[]> => {
  return api.get(`/api/rides?community=${encodeURIComponent(communityId)}`);
};

export const createRide = async (payload: CreateRidePayload): Promise<Ride> => {
  return api.post('/api/rides', payload);
};

export const getRide = async (rideId: string): Promise<Ride> => {
  return api.get(`/api/rides/${encodeURIComponent(rideId)}`);
};

export const joinRide = async (rideId: string, userId: string): Promise<Ride> => {
  return api.post(`/api/rides/${encodeURIComponent(rideId)}/join`, { userId });
};
