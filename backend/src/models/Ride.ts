import mongoose, { Document, Schema } from 'mongoose';

// Sub-document for storing rich location data
const LocationSchema = new Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  coordinates: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [longitude, latitude]
  }
}, { _id: false });

export interface IRide extends Document {
  owner: mongoose.Schema.Types.ObjectId;
  community: mongoose.Schema.Types.ObjectId;
  pickupLocation: { name: string; address: string; coordinates: { type: 'Point'; coordinates: [number, number]; }; };
  dropoffLocation: { name: string; address: string; coordinates: { type: 'Point'; coordinates: [number, number]; }; };
  departureTime: Date;
  status: 'active' | 'completed' | 'cancelled';
  participants: mongoose.Schema.Types.ObjectId[];
  capacity: number;
  price: number;
  notes?: string;
}

const RideSchema: Schema = new Schema({
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  community: { type: Schema.Types.ObjectId, ref: 'Community', required: true },
  pickupLocation: { type: LocationSchema, required: true },
  dropoffLocation: { type: LocationSchema, required: true },
  departureTime: { type: Date, required: true },
  status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },
  participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  capacity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
  notes: { type: String, maxlength: 500 },
});

// Add geospatial index for proximity searches later
RideSchema.index({ 'pickupLocation.coordinates': '2dsphere' });

export default mongoose.model<IRide>('Ride', RideSchema);
