import mongoose, { Document, Schema } from 'mongoose';

export interface IPlace extends Document {
  name: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  community: mongoose.Schema.Types.ObjectId;
}

const PlaceSchema: Schema = new Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  community: { type: Schema.Types.ObjectId, ref: 'Community', required: true },
});

export default mongoose.model<IPlace>('Place', PlaceSchema);
