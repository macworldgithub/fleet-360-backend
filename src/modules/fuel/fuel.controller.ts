import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { FuelService } from './fuel.service';
import { CreateFuelTransactionDto } from './dto/create-fuel-transaction.dto';
import { UpdateFuelTransactionDto } from './dto/update-fuel-transaction.dto';

@ApiTags('Fuel Transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api')
export class FuelController {
  constructor(private readonly fuelService: FuelService) {}

  @Post('fuel-transactions')
  @ApiOperation({ summary: 'Create fuel transaction' })
  create(@Body() dto: CreateFuelTransactionDto) {
    return this.fuelService.create(dto);
  }

  @Get('fuel-transactions')
  @ApiOperation({ summary: 'Get fuel transactions' })
  findAll(
    @Req() req,
    @Query('vehicleId') vehicleId?: string,
    @Query('agencyId') agencyId?: string,
  ) {
    const userAgencyId = req.user.agencyId;
    const role = req.user.role;
    return this.fuelService.findAll({ vehicleId, agencyId }, userAgencyId, role);
  }

  @Get('fuel-transactions/:id')
  @ApiOperation({ summary: 'Get fuel transaction by ID' })
  findOne(@Req() req, @Param('id') id: string) {
    const agencyId = req.user.agencyId;
    const role = req.user.role;
    return this.fuelService.findOne(id, agencyId, role);
  }

  @Patch('fuel-transactions/:id')
  @ApiOperation({ summary: 'Update fuel transaction' })
  update(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateFuelTransactionDto,
  ) {
    const agencyId = req.user.agencyId;
    const role = req.user.role;
    return this.fuelService.update(id, dto, agencyId, role);
  }
}