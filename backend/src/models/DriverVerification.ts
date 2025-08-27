import mongoose, { Document, Schema } from 'mongoose';

export interface IDriverVerification extends Document {
  user: mongoose.Schema.Types.ObjectId;
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'expired';
  
  // Identity verification
  identityDocument: {
    type: 'passport' | 'drivers_license' | 'national_id';
    documentNumber: string;
    frontImageId?: string; // GridFS file ID
    backImageId?: string; // GridFS file ID
    verificationStatus: 'pending' | 'verified' | 'rejected';
    verificationNotes?: string;
  };
  
  // Driving license verification
  drivingLicense: {
    licenseNumber: string;
    expiryDate: Date;
    issuingAuthority: string;
    imageId?: string; // GridFS file ID
    verificationStatus: 'pending' | 'verified' | 'rejected';
    verificationNotes?: string;
  };
  
  // Background check
  backgroundCheck: {
    status: 'pending' | 'clear' | 'flagged' | 'rejected';
    providerId?: string; // External service ID (Checkr, etc.)
    reportId?: string;
    completedAt?: Date;
    notes?: string;
  };
  
  // Vehicle information
  vehicle: {
    make: string;
    model: string;
    year?: number;
    color: string;
    licensePlate: string;
    registrationImageId?: string; // GridFS file ID
    insuranceImageId?: string; // GridFS file ID
    insuranceExpiryDate?: Date;
    verificationStatus: 'pending' | 'verified' | 'rejected';
    verificationNotes?: string;
  };
  
  // Overall verification
  approvedAt?: Date;
  approvedBy?: mongoose.Schema.Types.ObjectId;
  rejectedAt?: Date;
  rejectedBy?: mongoose.Schema.Types.ObjectId;
  rejectionReason?: string;
  expiresAt?: Date; // Verification expires after 1 year
}

const DriverVerificationSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  status: { 
    type: String, 
    enum: ['pending', 'in_review', 'approved', 'rejected', 'expired'], 
    default: 'pending' 
  },
  
  identityDocument: {
    type: {
      type: String,
      enum: ['passport', 'drivers_license', 'national_id'],
      required: true
    },
    documentNumber: { type: String, required: true },
    frontImageId: { type: String },
    backImageId: { type: String },
    verificationStatus: { 
      type: String, 
      enum: ['pending', 'verified', 'rejected'], 
      default: 'pending' 
    },
    verificationNotes: { type: String }
  },
  
  drivingLicense: {
    licenseNumber: { type: String, required: true },
    expiryDate: { type: Date, required: true },
    issuingAuthority: { type: String, required: true },
    imageId: { type: String },
    verificationStatus: { 
      type: String, 
      enum: ['pending', 'verified', 'rejected'], 
      default: 'pending' 
    },
    verificationNotes: { type: String }
  },
  
  backgroundCheck: {
    status: { 
      type: String, 
      enum: ['pending', 'clear', 'flagged', 'rejected'], 
      default: 'pending' 
    },
    providerId: { type: String },
    reportId: { type: String },
    completedAt: { type: Date },
    notes: { type: String }
  },
  
  vehicle: {
    make: { type: String, required: true },
    model: { type: String, required: true },
    year: { type: Number, required: false, min: 1900, max: new Date().getFullYear() + 1 },
    color: { type: String, required: true },
    licensePlate: { type: String, required: true },
    registrationImageId: { type: String },
    insuranceImageId: { type: String },
    insuranceExpiryDate: { type: Date, required: false },
    verificationStatus: { 
      type: String, 
      enum: ['pending', 'verified', 'rejected'], 
      default: 'pending' 
    },
    verificationNotes: { type: String }
  },
  
  approvedAt: { type: Date },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  rejectedAt: { type: Date },
  rejectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  rejectionReason: { type: String },
  expiresAt: { type: Date }
}, {
  timestamps: true
});

// Indexes
DriverVerificationSchema.index({ status: 1 });
DriverVerificationSchema.index({ 'backgroundCheck.status': 1 });
DriverVerificationSchema.index({ expiresAt: 1 });

// Pre-save middleware to set expiry date
DriverVerificationSchema.pre('save', function(next) {
  if (this.status === 'approved' && !this.expiresAt) {
    // Set expiry to 1 year from approval
    this.expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  }
  next();
});

export default mongoose.model<IDriverVerification>('DriverVerification', DriverVerificationSchema);
