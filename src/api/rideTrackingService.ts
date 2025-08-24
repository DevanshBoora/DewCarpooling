import { api } from './client';

export interface LocationUpdate {
  latitude: number;
  longitude: number;
  timestamp: Date;
  speed?: number;
  heading?: number;
}

export interface RideTrackingData {
  _id: string;
  ride: string;
  driver: {
    _id: string;
    name: string;
    avatar?: string;
    phone: string;
  };
  passengers: Array<{
    _id: string;
    name: string;
    avatar?: string;
    phone: string;
  }>;
  status: 'waiting' | 'en_route_pickup' | 'passenger_pickup' | 'en_route_destination' | 'completed' | 'cancelled';
  currentLocation: LocationUpdate;
  locationHistory: LocationUpdate[];
  estimatedArrival?: Date;
  actualPickupTime?: Date;
  actualDropoffTime?: Date;
  route?: {
    coordinates: [number, number][];
    distance: number;
    duration: number;
  };
  emergencyTriggered: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StartTrackingRequest {
  rideId: string;
  currentLocation: {
    latitude: number;
    longitude: number;
  };
  estimatedDuration?: number;
}

export interface LocationUpdateRequest {
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
}

// Start ride tracking
export const startRideTracking = async (data: StartTrackingRequest): Promise<RideTrackingData> => {
  return await api.post('/api/ride-tracking/start', data);
};

// Update driver location
export const updateDriverLocation = async (rideId: string, location: LocationUpdateRequest): Promise<void> => {
  await api.post(`/api/ride-tracking/${rideId}/location`, location);
};

// Mark pickup as complete
export const markPickupComplete = async (rideId: string): Promise<void> => {
  await api.post(`/api/ride-tracking/${rideId}/pickup-complete`);
};

// Complete ride
export const completeRide = async (rideId: string): Promise<void> => {
  await api.post(`/api/ride-tracking/${rideId}/complete`);
};

// Get ride tracking data
export const getRideTracking = async (rideId: string): Promise<RideTrackingData> => {
  return await api.get(`/api/ride-tracking/${rideId}`);
};

// Get active rides for current user
export const getActiveRides = async (): Promise<RideTrackingData[]> => {
  return await api.get('/api/ride-tracking/active');
};

// Trigger ride emergency
export const triggerRideEmergency = async (rideId: string, emergencyType: string): Promise<void> => {
  await api.post(`/api/ride-tracking/${rideId}/emergency`, { emergencyType });
};
