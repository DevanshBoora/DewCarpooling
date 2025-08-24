import mongoose, { Document, Schema } from 'mongoose';

export interface ITrustedContact extends Document {
  user: mongoose.Schema.Types.ObjectId;
  name: string;
  phone: string;
  email?: string;
  relationship: 'family' | 'friend' | 'colleague' | 'emergency_contact';
  isPrimary: boolean;
  isVerified: boolean;
  verificationCode?: string;
  verificationExpiry?: Date;
}

const TrustedContactSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, maxlength: 100 },
  phone: { type: String, required: true, match: /^\+[1-9]\d{1,14}$/ }, // E.164 format
  email: { type: String, lowercase: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  relationship: { 
    type: String, 
    enum: ['family', 'friend', 'colleague', 'emergency_contact'], 
    required: true 
  },
  isPrimary: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
  verificationCode: { type: String },
  verificationExpiry: { type: Date }
}, {
  timestamps: true
});

// Ensure only one primary contact per user
TrustedContactSchema.index({ user: 1, isPrimary: 1 }, { 
  unique: true, 
  partialFilterExpression: { isPrimary: true } 
});

TrustedContactSchema.index({ user: 1 });

export default mongoose.model<ITrustedContact>('TrustedContact', TrustedContactSchema);
