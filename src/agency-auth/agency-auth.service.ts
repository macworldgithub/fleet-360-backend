import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AgenciesService } from '../agencies/agencies.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AgencyRegisterDto } from './dto/agency-register.dto';
import { AgencyLoginDto } from './dto/agency-login.dto';

@Injectable()
export class AgencyAuthService {
  constructor(
    private agenciesService: AgenciesService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  private async signAccessToken(agencyId: string, email: string, role: string) {
    return this.jwtService.signAsync(
      { sub: agencyId, email, role, type: 'AGENCY' },
      {
        secret: this.configService.get('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN'),
      },
    );
  }

  private async signRefreshToken(
    agencyId: string,
    email: string,
    role: string,
  ) {
    return this.jwtService.signAsync(
      { sub: agencyId, email, role, type: 'AGENCY' },
      {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN'),
      },
    );
  }

  async register(dto: AgencyRegisterDto) {
    const existing = await this.agenciesService.findByEmail(dto.contactEmail);
    if (existing)
      throw new BadRequestException('Agency email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const agency = await this.agenciesService.create({
      agencyName: dto.agencyName,
      contactEmail: dto.contactEmail,
      contactPhone: dto.contactPhone,
      abn: dto.abn ?? null,
      address: dto.address ?? null,
      country: dto.country ?? undefined,
      state: dto.state ?? undefined,
      city: dto.city ?? undefined,
      passwordHash,
      role: dto.role,
      isEmailVerified: true,
    });

    return {
      message: 'Agency registered successfully.',
      agencyId: agency._id,
    };
  }

  async login(dto: AgencyLoginDto) {
    const agency = await this.agenciesService.findByEmail(dto.contactEmail);
    if (!agency) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, agency.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (!agency.isActive) {
      throw new ForbiddenException('Agency is inactive');
    }

    if (agency.role !== dto.role) {
      throw new UnauthorizedException(
        'Role mismatch. You are not authorized for this role.',
      );
    }

    const accessToken = await this.signAccessToken(
      agency._id.toString(),
      agency.contactEmail,
      agency.role,
    );

    const refreshToken = await this.signRefreshToken(
      agency._id.toString(),
      agency.contactEmail,
      agency.role,
    );

    await this.agenciesService.updateById(agency._id.toString(), {
      refreshTokenHash: await bcrypt.hash(refreshToken, 10),
    });

    return {
      accessToken,
      refreshToken,
      agency: {
        id: agency._id,
        agencyName: agency.agencyName,
        contactEmail: agency.contactEmail,
        role: agency.role,
        subscriptionTier: agency.subscriptionTier,
      },
    };
  }
}
