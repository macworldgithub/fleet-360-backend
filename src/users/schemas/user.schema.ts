import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop({ type: String, default: null })
  refreshTokenHash: string | null;

  @Prop({ type: String, default: null })
  resetPasswordTokenHash: string | null;

  @Prop({ type: Date, default: null })
  resetPasswordExpiresAt: Date | null;

  @Prop({ type: String, default: null })
  emailOtp: string | null;

  @Prop({ type: Date, default: null })
  emailOtpExpiresAt: Date | null;

  // New fields
  @Prop({ type: String, default: null })
  phoneNumber: string | null;

  @Prop({ type: String, default: null })
  driverLicenseNumber: string | null;

  @Prop({ type: String, default: null })
  agencyName: string | null;

  @Prop({ type: String, default: null })
  profilePicture: string | null;
}

export const UserSchema = SchemaFactory.createForClass(User);
