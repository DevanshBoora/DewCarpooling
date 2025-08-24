import { api } from './client';

export interface IncidentReport {
  _id?: string;
  type: 'safety' | 'harassment' | 'vehicle' | 'payment' | 'other';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  rideId?: string;
  reportedUserId?: string;
  reporterId: string;
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateIncidentRequest {
  type: 'safety' | 'harassment' | 'vehicle' | 'payment' | 'other';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  rideId?: string;
  reportedUserId?: string;
}

// Submit incident report
export const submitIncidentReport = async (data: CreateIncidentRequest): Promise<IncidentReport> => {
  return await api.post('/api/incidents', data);
};

// Get user's incident reports
export const getMyIncidentReports = async (): Promise<IncidentReport[]> => {
  return await api.get('/api/incidents/my-reports');
};

// Get incident report by ID
export const getIncidentReport = async (id: string): Promise<IncidentReport> => {
  return await api.get(`/api/incidents/${id}`);
};
