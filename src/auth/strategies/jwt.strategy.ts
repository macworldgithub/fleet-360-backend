import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../types/jwt-payload.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.type === 'AGENCY') {
      return {
        agencyId: payload.sub,
        email: payload.email,
        role: payload.role,
        type: payload.type,
      };
    }
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      agencyId: payload.agencyId,
      type: payload.type,
    };
  }
}
