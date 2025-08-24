import mongoose, { Document, Schema } from 'mongoose';

export interface IIncident extends Document {
  type: 'safety' | 'harassment' | 'vehicle' | 'payment' | 'other';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  rideId?: mongoose.Types.ObjectId;
  reportedUserId?: mongoose.Types.ObjectId;
  reporterId: mongoose.Types.ObjectId;
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
  adminNotes?: string;
  resolvedAt?: Date;
  resolvedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const IncidentSchema = new Schema<IIncident>({
  type: {
    type: String,
    enum: ['safety', 'harassment', 'vehicle', 'payment', 'other'],
    required: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
    minlength: 10,
    maxlength: 2000,
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true,
    default: 'medium',
  },
  rideId: {
    type: Schema.Types.ObjectId,
    ref: 'Ride',
    index: true,
  },
  reportedUserId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  reporterId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['pending', 'investigating', 'resolved', 'dismissed'],
    default: 'pending',
    index: true,
  },
  adminNotes: {
    type: String,
    trim: true,
    maxlength: 1000,
  },
  resolvedAt: {
    type: Date,
  },
  resolvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
IncidentSchema.index({ reporterId: 1, createdAt: -1 });
IncidentSchema.index({ status: 1, severity: -1, createdAt: -1 });
IncidentSchema.index({ type: 1, status: 1 });

// Middleware to set resolvedAt when status changes to resolved
IncidentSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'resolved' && !this.resolvedAt) {
    this.resolvedAt = new Date();
  }
  next();
});

export default mongoose.model<IIncident>('Incident', IncidentSchema);
