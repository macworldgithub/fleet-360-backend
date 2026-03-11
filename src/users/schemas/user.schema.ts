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

  // Role
  @Prop({
    required: true,
    enum: ['PASSENGER', 'DRIVER'],
    default: 'DRIVER',
  })
  role: string;

  @Prop({ default: false })
  isEmailVerified: boolean;

  // Refresh token
  @Prop({ type: String, default: null })
  refreshTokenHash: string | null;

  // Email verification
  @Prop({ type: String, default: null })
  emailVerificationTokenHash: string | null;

  @Prop({ type: Date, default: null })
  emailVerificationExpiresAt: Date | null;

  // Reset password
  @Prop({ type: String, default: null })
  resetPasswordTokenHash: string | null;

  @Prop({ type: Date, default: null })
  resetPasswordExpiresAt: Date | null;
}

export const UserSchema = SchemaFactory.createForClass(User);
