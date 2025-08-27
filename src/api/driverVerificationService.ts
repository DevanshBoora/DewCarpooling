import { api } from './client';
import { uploadFile } from './fileService';

// Payload expected by backend driverVerificationController
export interface DriverVerificationData {
  identityDocument: {
    type: 'passport' | 'drivers_license' | 'national_id';
    documentNumber: string;
    frontImageId?: string;
    backImageId?: string;
  };
  drivingLicense: {
    licenseNumber: string;
    expiryDate: string; // YYYY-MM-DD
    issuingAuthority: string;
    imageId?: string; // optional consolidated image id
    frontImageId?: string;
    backImageId?: string;
  };
  vehicle: {
    make: string;
    model: string;
    color: string;
    licensePlate: string;
    year?: number;
    insuranceExpiryDate?: string; // YYYY-MM-DD
  };
  faceImageId?: string; // optional selfie image id if captured
}

export interface DriverVerificationStatus {
  id: string;
  userId: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  submittedAt: Date;
  reviewedAt?: Date;
  rejectionReason?: string;
  faceImageId?: string;
  identityDocument: {
    type: 'passport' | 'drivers_license' | 'national_id';
    documentNumber: string;
    frontImageId?: string;
    backImageId?: string;
  };
  drivingLicense: {
    licenseNumber: string;
    expiryDate: string;
    issuingAuthority: string;
    imageId?: string;
    frontImageId?: string;
    backImageId?: string;
  };
  vehicle: {
    make: string;
    model: string;
    year?: number;
    color: string;
    licensePlate: string;
    insuranceExpiryDate?: string;
  };
}

export const submitDriverVerification = async (data: DriverVerificationData): Promise<{ message: string }> => {
  try {
    const response = await api.post<{ message: string }>('/api/driver-verification/submit', data);
    return response;
  } catch (error) {
    console.error('Driver verification submission error:', error);
    throw new Error('Failed to submit driver verification');
  }
};

export const getDriverVerificationStatus = async (): Promise<DriverVerificationStatus | null> => {
  try {
    const response = await api.get<DriverVerificationStatus | null>('/api/driver-verification/status');
    return response;
  } catch (error) {
    console.error('Driver verification status error:', error);
    return null;
  }
};

export const uploadDriverDocument = async (fileUri: string, _documentType: string): Promise<{ fileId: string }> => {
  // Delegate to the unified files service (POST /api/files JSON base64 upload)
  return uploadFile(fileUri);
};
