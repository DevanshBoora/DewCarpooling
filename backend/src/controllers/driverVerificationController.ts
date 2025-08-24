import { Request, Response } from 'express';
import DriverVerification, { IDriverVerification } from '../models/DriverVerification';
import User from '../models/User';
import { AuthedRequest } from '../middleware/authMiddleware';

// POST /api/driver-verification/submit
export const submitDriverVerification = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Not authorized' });

    const {
      identityDocument,
      drivingLicense,
      vehicle
    } = req.body as {
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
      };
      vehicle: {
        make: string;
        model: string;
        year: number;
        color: string;
        licensePlate: string;
        registrationImageId?: string;
        insuranceImageId?: string;
        insuranceExpiryDate: string;
      };
    };

    // Validation
    const errors: Record<string, string> = {};
    
    if (!identityDocument?.type) errors.identityType = 'Identity document type is required';
    if (!identityDocument?.documentNumber?.trim()) errors.documentNumber = 'Document number is required';
    
    if (!drivingLicense?.licenseNumber?.trim()) errors.licenseNumber = 'License number is required';
    if (!drivingLicense?.expiryDate) errors.licenseExpiry = 'License expiry date is required';
    if (!drivingLicense?.issuingAuthority?.trim()) errors.issuingAuthority = 'Issuing authority is required';
    
    if (!vehicle?.make?.trim()) errors.vehicleMake = 'Vehicle make is required';
    if (!vehicle?.model?.trim()) errors.vehicleModel = 'Vehicle model is required';
    if (!vehicle?.year || vehicle.year < 2000) errors.vehicleYear = 'Valid vehicle year is required';
    if (!vehicle?.color?.trim()) errors.vehicleColor = 'Vehicle color is required';
    if (!vehicle?.licensePlate?.trim()) errors.licensePlate = 'License plate is required';
    if (!vehicle?.insuranceExpiryDate) errors.insuranceExpiry = 'Insurance expiry date is required';

    // Check if license and insurance are not expired
    const licenseExpiry = new Date(drivingLicense.expiryDate);
    const insuranceExpiry = new Date(vehicle.insuranceExpiryDate);
    const now = new Date();

    if (licenseExpiry <= now) errors.licenseExpiry = 'Driving license has expired';
    if (insuranceExpiry <= now) errors.insuranceExpiry = 'Vehicle insurance has expired';

    if (Object.keys(errors).length) {
      return res.status(422).json({ message: 'Validation failed', errors });
    }

    // Check if user already has a verification record
    const existingVerification = await DriverVerification.findOne({ user: req.userId });
    
    if (existingVerification && existingVerification.status === 'approved') {
      return res.status(400).json({ 
        message: 'Driver verification already approved',
        status: existingVerification.status,
        expiresAt: existingVerification.expiresAt
      });
    }

    // Create or update verification record
    const verificationData = {
      user: req.userId,
      status: 'pending' as const,
      identityDocument: {
        ...identityDocument,
        verificationStatus: 'pending' as const
      },
      drivingLicense: {
        ...drivingLicense,
        expiryDate: licenseExpiry,
        verificationStatus: 'pending' as const
      },
      vehicle: {
        ...vehicle,
        insuranceExpiryDate: insuranceExpiry,
        verificationStatus: 'pending' as const
      },
      backgroundCheck: {
        status: 'pending' as const
      }
    };

    let verification: IDriverVerification;
    if (existingVerification) {
      verification = await DriverVerification.findByIdAndUpdate(
        existingVerification._id,
        verificationData,
        { new: true }
      ) as IDriverVerification;
    } else {
      verification = await DriverVerification.create(verificationData);
    }

    // TODO: Trigger background check with external service (Checkr, etc.)
    console.log(`[DRIVER_VERIFICATION] Submitted for user ${req.userId}`);
    // await initiateBackgroundCheck(req.userId, verification._id);

    return res.status(201).json({
      _id: verification._id,
      status: verification.status,
      message: 'Driver verification submitted successfully. You will be notified once the review is complete.',
      estimatedReviewTime: '2-3 business days'
    });

  } catch (error: any) {
    console.error('Submit driver verification error:', error);
    return res.status(500).json({ 
      message: 'Failed to submit driver verification', 
      error: error?.message || String(error) 
    });
  }
};

// GET /api/driver-verification/status
export const getVerificationStatus = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Not authorized' });

    const verification = await DriverVerification.findOne({ user: req.userId });
    
    if (!verification) {
      return res.json({
        status: 'not_submitted',
        message: 'Driver verification not yet submitted'
      });
    }

    // Check if verification has expired
    if (verification.status === 'approved' && verification.expiresAt && verification.expiresAt < new Date()) {
      await DriverVerification.findByIdAndUpdate(verification._id, { status: 'expired' });
      return res.json({
        status: 'expired',
        message: 'Driver verification has expired. Please resubmit.',
        expiresAt: verification.expiresAt
      });
    }

    return res.json({
      _id: verification._id,
      status: verification.status,
      identityDocument: {
        type: verification.identityDocument.type,
        verificationStatus: verification.identityDocument.verificationStatus,
        verificationNotes: verification.identityDocument.verificationNotes
      },
      drivingLicense: {
        verificationStatus: verification.drivingLicense.verificationStatus,
        verificationNotes: verification.drivingLicense.verificationNotes,
        expiryDate: verification.drivingLicense.expiryDate
      },
      vehicle: {
        make: verification.vehicle.make,
        model: verification.vehicle.model,
        year: verification.vehicle.year,
        color: verification.vehicle.color,
        licensePlate: verification.vehicle.licensePlate,
        verificationStatus: verification.vehicle.verificationStatus,
        verificationNotes: verification.vehicle.verificationNotes,
        insuranceExpiryDate: verification.vehicle.insuranceExpiryDate
      },
      backgroundCheck: {
        status: verification.backgroundCheck.status,
        completedAt: verification.backgroundCheck.completedAt,
        notes: verification.backgroundCheck.notes
      },
      approvedAt: verification.approvedAt,
      rejectedAt: verification.rejectedAt,
      rejectionReason: verification.rejectionReason,
      expiresAt: verification.expiresAt,
      createdAt: (verification as any).createdAt,
      updatedAt: (verification as any).updatedAt
    });

  } catch (error: any) {
    console.error('Get verification status error:', error);
    return res.status(500).json({ 
      message: 'Failed to get verification status', 
      error: error?.message || String(error) 
    });
  }
};

// POST /api/driver-verification/resubmit
export const resubmitVerification = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Not authorized' });

    const verification = await DriverVerification.findOne({ user: req.userId });
    
    if (!verification) {
      return res.status(404).json({ message: 'No verification record found' });
    }

    if (verification.status === 'approved' && verification.expiresAt && verification.expiresAt > new Date()) {
      return res.status(400).json({ message: 'Current verification is still valid' });
    }

    if (verification.status === 'pending' || verification.status === 'in_review') {
      return res.status(400).json({ message: 'Verification is already under review' });
    }

    // Reset verification status for resubmission
    await DriverVerification.findByIdAndUpdate(verification._id, {
      status: 'pending',
      'identityDocument.verificationStatus': 'pending',
      'identityDocument.verificationNotes': undefined,
      'drivingLicense.verificationStatus': 'pending',
      'drivingLicense.verificationNotes': undefined,
      'vehicle.verificationStatus': 'pending',
      'vehicle.verificationNotes': undefined,
      'backgroundCheck.status': 'pending',
      'backgroundCheck.notes': undefined,
      rejectedAt: undefined,
      rejectedBy: undefined,
      rejectionReason: undefined,
      expiresAt: undefined
    });

    return res.json({
      message: 'Verification reset for resubmission. Please update your information and resubmit.',
      status: 'pending'
    });

  } catch (error: any) {
    console.error('Resubmit verification error:', error);
    return res.status(500).json({ 
      message: 'Failed to resubmit verification', 
      error: error?.message || String(error) 
    });
  }
};

// Admin endpoints (would require admin middleware in production)

// POST /api/driver-verification/:id/approve
export const approveVerification = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Not authorized' });

    const { id } = req.params;
    const { notes } = req.body as { notes?: string };

    const verification = await DriverVerification.findById(id);
    if (!verification) {
      return res.status(404).json({ message: 'Verification not found' });
    }

    await DriverVerification.findByIdAndUpdate(id, {
      status: 'approved',
      'identityDocument.verificationStatus': 'verified',
      'drivingLicense.verificationStatus': 'verified',
      'vehicle.verificationStatus': 'verified',
      'backgroundCheck.status': 'clear',
      approvedAt: new Date(),
      approvedBy: req.userId,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      rejectedAt: undefined,
      rejectedBy: undefined,
      rejectionReason: undefined
    });

    // TODO: Send notification to user
    console.log(`[DRIVER_VERIFICATION] Approved verification ${id}`);

    return res.json({
      message: 'Driver verification approved successfully',
      status: 'approved'
    });

  } catch (error: any) {
    console.error('Approve verification error:', error);
    return res.status(500).json({ 
      message: 'Failed to approve verification', 
      error: error?.message || String(error) 
    });
  }
};

// POST /api/driver-verification/:id/reject
export const rejectVerification = async (req: AuthedRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: 'Not authorized' });

    const { id } = req.params;
    const { reason, notes } = req.body as { reason: string; notes?: string };

    if (!reason?.trim()) {
      return res.status(422).json({ 
        message: 'Rejection reason is required',
        errors: { reason: 'required' }
      });
    }

    const verification = await DriverVerification.findById(id);
    if (!verification) {
      return res.status(404).json({ message: 'Verification not found' });
    }

    await DriverVerification.findByIdAndUpdate(id, {
      status: 'rejected',
      rejectedAt: new Date(),
      rejectedBy: req.userId,
      rejectionReason: reason,
      'backgroundCheck.notes': notes,
      approvedAt: undefined,
      approvedBy: undefined,
      expiresAt: undefined
    });

    // TODO: Send notification to user with rejection reason
    console.log(`[DRIVER_VERIFICATION] Rejected verification ${id}: ${reason}`);

    return res.json({
      message: 'Driver verification rejected',
      status: 'rejected',
      reason
    });

  } catch (error: any) {
    console.error('Reject verification error:', error);
    return res.status(500).json({ 
      message: 'Failed to reject verification', 
      error: error?.message || String(error) 
    });
  }
};
