import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { CostIntelligenceService } from './cost-intelligence.service';

@Controller('api')
export class CostIntelligenceController {
  constructor(private readonly service: CostIntelligenceService) {}

  @Get('vehicles/:vehicleId/cost-summary')
  getVehicleCostSummary(@Param('vehicleId') vehicleId: string) {
    return this.service.getVehicleCostSummary(vehicleId);
  }

  @Get('vehicles/:vehicleId/cost-breakdown')
  getVehicleCostBreakdown(@Param('vehicleId') vehicleId: string) {
    return this.service.getVehicleCostBreakdown(vehicleId);
  }

  @Get('agencies/:agencyId/fleet-cost-summary')
  getFleetCostSummary(@Param('agencyId') agencyId: string) {
    return this.service.getFleetCostSummary(agencyId);
  }

  @Post('vehicles/:vehicleId/cost-replace-analysis')
  costReplaceAnalysis(
    @Param('vehicleId') vehicleId: string,
    @Body() body: any,
  ) {
    return this.service.costReplaceAnalysis(vehicleId, body);
  }
}