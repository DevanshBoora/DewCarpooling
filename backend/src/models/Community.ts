import mongoose, { Document, Schema } from 'mongoose';

export interface ICommunity extends Document {
  name: string;
  description: string;
  members: mongoose.Schema.Types.ObjectId[];
  places: mongoose.Schema.Types.ObjectId[];
}

const CommunitySchema: Schema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  places: [{ type: Schema.Types.ObjectId, ref: 'Place' }],
});

export default mongoose.model<ICommunity>('Community', CommunitySchema);
