import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  phone?: string;
  isPhoneVerified: boolean;
  isProfileComplete?: boolean;
  email?: string;
  password?: string; // Password will be selected off by default
  avatar: string; // GridFS fileId string
  community?: mongoose.Schema.Types.ObjectId;
  rating: number;
  memberSince: Date;
  ridesGiven: number;
  ridesTaken: number;
  co2Saved: number; // in kg
  ecoImpact: number; // percentage
  comparePassword(password: string): Promise<boolean>;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  phone: { type: String, required: false, unique: true, sparse: true },
  isPhoneVerified: { type: Boolean, default: false },
  isProfileComplete: { type: Boolean, default: false },
  email: { type: String, required: false, unique: false, lowercase: true },
  password: { type: String, required: false, select: false }, // select: false hides it from default queries
  avatar: { type: String, required: false, default: '' },
  community: { type: Schema.Types.ObjectId, ref: 'Community' },
  rating: { type: Number, default: 0 },
  memberSince: { type: Date, default: Date.now },
  ridesGiven: { type: Number, default: 0 },
  ridesTaken: { type: Number, default: 0 },
  co2Saved: { type: Number, default: 0 },
  ecoImpact: { type: Number, default: 0 },
});

// Hash password before saving
UserSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Method to compare password for login
UserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

export default mongoose.model<IUser>('User', UserSchema);
