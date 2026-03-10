import { Controller, Get, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get aggregated dashboard stats for the agency' })
  async getStats(@Req() req) {
    const agencyId = req.user.agencyId;
    const role = req.user.role;
    if (!agencyId && role !== 'PRINCIPAL') {
      throw new ForbiddenException('User is not associated with any agency');
    }
    return this.dashboardService.getStats(agencyId, role);
  }
}
