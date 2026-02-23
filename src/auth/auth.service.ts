import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { DriverService } from '../modules/drivers/driver.service';
import { AgenciesService } from '../agencies/agencies.service';
import { RegisterDto, UserRole } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto';
import { hashToken, generateToken } from '../common/utils/crypto.util';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private driverService: DriverService,
    private agenciesService: AgenciesService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  private async signAccessToken(userId: string, email: string) {
    return this.jwtService.signAsync(
      { sub: userId, email },
      {
        secret: this.configService.get('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN'),
      },
    );
  }

  private async signRefreshToken(userId: string, email: string) {
    return this.jwtService.signAsync(
      { sub: userId, email },
      {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN'),
      },
    );
  }

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new BadRequestException('Email already registered');

    let resolvedAgencyId: string | undefined;

    // ── Role-specific validation ──
    if (dto.role === UserRole.DRIVER) {
      if (!dto.driverLicenseNumber) {
        throw new BadRequestException(
          'driverLicenseNumber is required for DRIVER role.',
        );
      }
      if (!dto.agencyName) {
        throw new BadRequestException('agencyName is required for DRIVER role.');
      }

      const agency = await this.agenciesService.findByName(dto.agencyName);
      if (!agency) {
        throw new BadRequestException(
          `Agency with name "${dto.agencyName}" not found.`,
        );
      }
      resolvedAgencyId = agency._id.toString();
    }

    if (dto.role === UserRole.PASSENGER) {
      if (dto.driverLicenseNumber) {
        throw new BadRequestException(
          'driverLicenseNumber is not allowed for PASSENGER role.',
        );
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const verificationToken = generateToken();
    const verificationTokenHash = hashToken(verificationToken);

    const user = await this.usersService.create({
      fullName: dto.fullName,
      email: dto.email,
      passwordHash,
      role: dto.role,
      isEmailVerified: false,
      emailVerificationTokenHash: verificationTokenHash,
      emailVerificationExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24h
    });

    // ── Automatic driver record creation ──
    if (dto.role === UserRole.DRIVER && resolvedAgencyId) {
      await this.driverService.create(
        {
          name: dto.fullName,
          email: dto.email,
          phoneNumber: dto.phoneNumber!,
          driverLicenseNumber: dto.driverLicenseNumber!,
        },
        resolvedAgencyId,
      );
    }

    return {
      message: 'User registered successfully. Please verify your email.',
      userId: user._id,
      emailVerificationToken: verificationToken, // remove this in production
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (user.role !== dto.role) {
      throw new UnauthorizedException('Role mismatch. You are not authorized for this role.');
    }

    if (!user.isEmailVerified) {
      throw new ForbiddenException('Email is not verified');
    }

    const accessToken = await this.signAccessToken(
      user._id.toString(),
      user.email,
    );
    const refreshToken = await this.signRefreshToken(
      user._id.toString(),
      user.email,
    );

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    await this.usersService.updateById(user._id.toString(), {
      refreshTokenHash,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    };
  }

  async logout(refreshToken: string) {
    const decoded = await this.jwtService.verifyAsync(refreshToken, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
    });

    const user = await this.usersService.findById(decoded.sub);
    if (!user) throw new NotFoundException('User not found');

    await this.usersService.updateById(user._id.toString(), {
      refreshTokenHash: null,
    });

    return { message: 'Logged out successfully' };
  }

  async refreshToken(refreshToken: string) {
    let decoded: any;

    try {
      decoded = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersService.findById(decoded.sub);
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Refresh token not valid');
    }

    const match = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!match) throw new UnauthorizedException('Refresh token not valid');

    const newAccessToken = await this.signAccessToken(
      user._id.toString(),
      user.email,
    );
    const newRefreshToken = await this.signRefreshToken(
      user._id.toString(),
      user.email,
    );

    await this.usersService.updateById(user._id.toString(), {
      refreshTokenHash: await bcrypt.hash(newRefreshToken, 10),
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);

    // Security: always return success response
    if (!user) {
      return {
        message: 'If the email exists, password reset link will be sent.',
      };
    }

    const resetToken = generateToken();
    const resetTokenHash = hashToken(resetToken);

    await this.usersService.updateById(user._id.toString(), {
      resetPasswordTokenHash: resetTokenHash,
      resetPasswordExpiresAt: new Date(Date.now() + 1000 * 60 * 30), // 30 min
    });

    // TODO: send email with FRONTEND_URL/reset-password?token=resetToken

    return {
      message: 'If the email exists, password reset link will be sent.',
      resetToken: resetToken, // remove this in production
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = hashToken(token);

    const user = await this.usersService.findByResetToken(tokenHash);
    if (!user) throw new BadRequestException('Invalid or expired token');

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.usersService.updateById(user._id.toString(), {
      passwordHash,
      resetPasswordTokenHash: null,
      resetPasswordExpiresAt: null,
      refreshTokenHash: null,
    });

    return { message: 'Password reset successfully' };
  }

  async verifyEmail(token: string) {
    const tokenHash = hashToken(token);

    const user = await this.usersService.findByVerificationToken(tokenHash);
    if (!user)
      throw new BadRequestException('Invalid or expired verification token');

    await this.usersService.updateById(user._id.toString(), {
      isEmailVerified: true,
      emailVerificationTokenHash: null,
      emailVerificationExpiresAt: null,
    });

    return { message: 'Email verified successfully' };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid)
      throw new UnauthorizedException('Current password is incorrect');

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.usersService.updateById(userId, {
      passwordHash,
      refreshTokenHash: null, // force re-login
    });

    return { message: 'Password changed successfully' };
  }
}
