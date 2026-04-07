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
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto';
import { hashToken, generateToken } from '../common/utils/crypto.util';
import { MailService } from '../common/mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private driverService: DriverService,
    private agenciesService: AgenciesService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
  ) {}

  private async signAccessToken(
    userId: string,
    email: string,
    agencyId?: string,
  ) {
    return this.jwtService.signAsync(
      { sub: userId, email, agencyId, type: 'USER' },
      {
        secret: this.configService.get('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN'),
      },
    );
  }

  private async signRefreshToken(
    userId: string,
    email: string,
    agencyId?: string,
  ) {
    return this.jwtService.signAsync(
      { sub: userId, email, agencyId, type: 'USER' },
      {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN'),
      },
    );
  }

  async register(dto: RegisterDto, file?: Express.Multer.File) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new BadRequestException('Email already registered');

    let resolvedAgencyId: string | undefined;

    // ── Role-specific validation ──
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

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);

    const user = await this.usersService.create({
      fullName: dto.fullName,
      email: dto.email,
      passwordHash,
      phoneNumber: dto.phoneNumber ?? null,
      driverLicenseNumber: dto.driverLicenseNumber ?? null,
      agencyName: dto.agencyName ?? null,
      profilePicture: file?.filename ?? null,
      isEmailVerified: false,
      emailOtp: otpHash,
      emailOtpExpiresAt: new Date(Date.now() + 1000 * 60 * 10), // 10 min
    });

    await this.mailService.sendOtpEmail(dto.email, otp);

    let driverData;
    if (resolvedAgencyId) {
      const driver = await this.driverService.create(
        {
          name: dto.fullName,
          email: dto.email,
          phoneNumber: dto.phoneNumber!,
          driverLicenseNumber: dto.driverLicenseNumber!,
        },
        resolvedAgencyId,
        file,
      );
      driverData = driver;
    }

    return {
      message: 'User registered successfully. Please verify your email.',
      userId: user._id.toString(),
      driverId: driverData ? driverData._id.toString() : null,
      driver: driverData ?? null,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (!user.isEmailVerified) {
      throw new ForbiddenException('Email is not verified');
    }

    let resolvedAgencyId: string | undefined;
    const driver = await this.driverService.findByEmail(user.email);
    resolvedAgencyId = driver?.agencyId?.toString();

    const accessToken = await this.signAccessToken(
      user._id.toString(),
      user.email,
      resolvedAgencyId,
    );
    const refreshToken = await this.signRefreshToken(
      user._id.toString(),
      user.email,
      resolvedAgencyId,
    );

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    await this.usersService.updateById(user._id.toString(), {
      refreshTokenHash,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id.toString(),
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        driverLicenseNumber: user.driverLicenseNumber,
        agencyName: user.agencyName,
        profilePicture: user.profilePicture,
      },
    };
  }

  async forgotPasswordEmail(email: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      return { message: 'If the email exists, a new password will be sent.' };
    }

    const newPassword = generateToken().slice(0, 10); // 10-char random password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.usersService.updateById(user._id.toString(), {
      passwordHash,
      refreshTokenHash: null,
      resetPasswordTokenHash: null,
      resetPasswordExpiresAt: null,
    });

    await this.mailService.sendNewPasswordEmail(user.email, newPassword);

    return { message: 'If the email exists, a new password has been sent.' };
  }

  async verifyOtp(email: string, otp: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new BadRequestException('Invalid email');

    if (!user.emailOtp || !user.emailOtpExpiresAt) {
      throw new BadRequestException('OTP not found');
    }

    if (user.emailOtpExpiresAt < new Date()) {
      throw new BadRequestException('OTP expired');
    }

    const isMatch = await bcrypt.compare(otp, user.emailOtp);
    if (!isMatch) {
      throw new BadRequestException('Invalid OTP');
    }

    await this.usersService.updateById(user._id.toString(), {
      isEmailVerified: true,
      emailOtp: null,
      emailOtpExpiresAt: null,
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
