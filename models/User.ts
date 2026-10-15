import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name?: string;
  email: string;
  passwordHash?: string;
  image?: string | null;
  emailVerified?: Date | null;
  provider?: 'credentials' | 'google' | 'github' | 'facebook' | 'apple';
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      select: false,
    },
    image: { type: String },
    emailVerified: { type: Date, default: null },
    provider: {
      type: String,
      enum: ['credentials', 'google', 'github', 'facebook', 'apple'],
      default: 'credentials',
    },
  },
  { timestamps: true }
);

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
