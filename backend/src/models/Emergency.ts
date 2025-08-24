import mongoose, { Document, Schema } from 'mongoose';

export interface IEmergency extends Document {
  user: mongoose.Schema.Types.ObjectId;
  ride?: mongoose.Schema.Types.ObjectId;
  type: 'sos' | 'panic' | 'medical' | 'accident' | 'harassment';
  status: 'active' | 'resolved' | 'false_alarm';
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  address?: string;
  message?: string;
  trustedContactsNotified: boolean;
  emergencyServicesNotified: boolean;
  responseTime?: Date;
  resolvedAt?: Date;
  resolvedBy?: mongoose.Schema.Types.ObjectId;
  notes?: string;
}

const EmergencySchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  ride: { type: Schema.Types.ObjectId, ref: 'Ride' },
  type: { 
    type: String, 
    enum: ['sos', 'panic', 'medical', 'accident', 'harassment'], 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['active', 'resolved', 'false_alarm'], 
    default: 'active' 
  },
  location: {
    type: { type: String, enum: ['Point'], required: true },
    coordinates: { type: [Number], required: true }
  },
  address: { type: String },
  message: { type: String, maxlength: 500 },
  trustedContactsNotified: { type: Boolean, default: false },
  emergencyServicesNotified: { type: Boolean, default: false },
  responseTime: { type: Date },
  resolvedAt: { type: Date },
  resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String, maxlength: 1000 }
}, {
  timestamps: true
});

// Add geospatial index for location-based queries
EmergencySchema.index({ location: '2dsphere' });
EmergencySchema.index({ user: 1, status: 1 });
EmergencySchema.index({ createdAt: -1 });

export default mongoose.model<IEmergency>('Emergency', EmergencySchema);
