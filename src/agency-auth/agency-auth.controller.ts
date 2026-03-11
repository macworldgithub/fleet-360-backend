import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AgencyAuthService } from './agency-auth.service';
import { AgencyRegisterDto } from './dto/agency-register.dto';
import { AgencyLoginDto } from './dto/agency-login.dto';

@ApiTags('Agency Auth')
@Controller('api/agency-auth')
export class AgencyAuthController {
  constructor(private readonly agencyAuthService: AgencyAuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register new agency (Fleet Manager dashboard)' })
  register(@Body() dto: AgencyRegisterDto) {
    return this.agencyAuthService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login agency (Fleet Manager dashboard)' })
  login(@Body() dto: AgencyLoginDto) {
    return this.agencyAuthService.login(dto);
  }
}
