import mongoose, { Document, Schema } from 'mongoose';

export interface IRideTracking extends Document {
  ride: mongoose.Schema.Types.ObjectId;
  driver: mongoose.Schema.Types.ObjectId;
  passengers: mongoose.Schema.Types.ObjectId[];
  status: 'waiting' | 'started' | 'in_progress' | 'completed' | 'cancelled' | 'emergency';
  
  // Real-time location tracking
  currentLocation: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  locationHistory: Array<{
    location: {
      type: 'Point';
      coordinates: [number, number];
    };
    timestamp: Date;
    speed?: number; // km/h
    heading?: number; // degrees
  }>;
  
  // Route information
  plannedRoute: Array<{
    location: {
      type: 'Point';
      coordinates: [number, number];
    };
    instruction?: string;
    estimatedTime?: number; // seconds from start
  }>;
  
  // Safety tracking
  lastLocationUpdate: Date;
  isOffRoute: boolean;
  offRouteDistance?: number; // meters
  offRouteStartTime?: Date;
  
  // Trip milestones
  startedAt?: Date;
  pickupCompletedAt?: Date;
  dropoffCompletedAt?: Date;
  completedAt?: Date;
  
  // Emergency tracking
  emergencyTriggered: boolean;
  emergencyDetails?: {
    triggeredBy: mongoose.Schema.Types.ObjectId;
    type: string;
    location: {
      type: 'Point';
      coordinates: [number, number];
    };
    timestamp: Date;
  };
  
  // Estimated times
  estimatedPickupTime?: Date;
  estimatedDropoffTime?: Date;
  estimatedDuration?: number; // minutes
  
  // Communication
  lastDriverMessage?: Date;
  lastPassengerMessage?: Date;
}

const LocationPointSchema = new Schema({
  type: { type: String, enum: ['Point'], default: 'Point' },
  coordinates: { type: [Number], required: true }
}, { _id: false });

const LocationHistorySchema = new Schema({
  location: LocationPointSchema,
  timestamp: { type: Date, default: Date.now },
  speed: { type: Number },
  heading: { type: Number }
}, { _id: false });

const PlannedRouteSchema = new Schema({
  location: LocationPointSchema,
  instruction: { type: String },
  estimatedTime: { type: Number }
}, { _id: false });

const EmergencyDetailsSchema = new Schema({
  triggeredBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true },
  location: LocationPointSchema,
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const RideTrackingSchema: Schema = new Schema({
  ride: { type: Schema.Types.ObjectId, ref: 'Ride', required: true, unique: true },
  driver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  passengers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  status: { 
    type: String, 
    enum: ['waiting', 'started', 'in_progress', 'completed', 'cancelled', 'emergency'], 
    default: 'waiting' 
  },
  
  currentLocation: LocationPointSchema,
  locationHistory: [LocationHistorySchema],
  plannedRoute: [PlannedRouteSchema],
  
  lastLocationUpdate: { type: Date, default: Date.now },
  isOffRoute: { type: Boolean, default: false },
  offRouteDistance: { type: Number },
  offRouteStartTime: { type: Date },
  
  startedAt: { type: Date },
  pickupCompletedAt: { type: Date },
  dropoffCompletedAt: { type: Date },
  completedAt: { type: Date },
  
  emergencyTriggered: { type: Boolean, default: false },
  emergencyDetails: EmergencyDetailsSchema,
  
  estimatedPickupTime: { type: Date },
  estimatedDropoffTime: { type: Date },
  estimatedDuration: { type: Number },
  
  lastDriverMessage: { type: Date },
  lastPassengerMessage: { type: Date }
}, {
  timestamps: true
});

// Indexes for efficient queries
RideTrackingSchema.index({ driver: 1, status: 1 });
RideTrackingSchema.index({ passengers: 1, status: 1 });
RideTrackingSchema.index({ currentLocation: '2dsphere' });
RideTrackingSchema.index({ status: 1, lastLocationUpdate: 1 });
RideTrackingSchema.index({ emergencyTriggered: 1 });

// TTL index to automatically clean up completed rides after 30 days
RideTrackingSchema.index({ completedAt: 1 }, { 
  expireAfterSeconds: 30 * 24 * 60 * 60, // 30 days
  partialFilterExpression: { status: { $in: ['completed', 'cancelled'] } }
});

export default mongoose.model<IRideTracking>('RideTracking', RideTrackingSchema);
