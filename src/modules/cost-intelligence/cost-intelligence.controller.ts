import { Controller, Get, Post, Body, Param, Req, UseGuards } from '@nestjs/common';
import { CostIntelligenceService } from './cost-intelligence.service';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@ApiTags('Cost Intelligence')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/cost-intelligence')
export class CostIntelligenceController {
  constructor(private readonly costService: CostIntelligenceService) {}

  @Get('vehicles/:vehicleId/cost-summary')
  @ApiOperation({ summary: 'Get total cost summary for a vehicle' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ObjectId' })
  getVehicleCostSummary(@Param('vehicleId') vehicleId: string) {
    return this.costService.getVehicleCostSummary(vehicleId);
  }

  @Get('vehicles/:vehicleId/cost-breakdown')
  @ApiOperation({ summary: 'Get cost breakdown for a vehicle' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ObjectId' })
  getVehicleCostBreakdown(@Param('vehicleId') vehicleId: string) {
    return this.costService.getVehicleCostBreakdown(vehicleId);
  }

  @Get('agencies/:agencyId/fleet-cost-summary')
  @ApiOperation({ summary: 'Get fleet cost summary for an agency' })
  @ApiParam({ name: 'agencyId', description: 'Agency ObjectId' })
  getFleetCostSummary(@Req() req) {
    const agencyId = req.user.agencyId;
    const role = req.user.role;
    return this.costService.getFleetCostSummary(agencyId, role);
  }

  @Post('vehicles/:vehicleId/cost-replace-analysis')
  @ApiOperation({ summary: 'Perform cost vs replacement analysis' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ObjectId' })
  costReplaceAnalysis(
    @Param('vehicleId') vehicleId: string,
    @Body() body: any,
  ) {
    return this.costService.costReplaceAnalysis(vehicleId, body);
  }
}