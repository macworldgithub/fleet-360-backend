import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
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
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
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
    @Query('agencyId') agencyId?: string,
    @Query('vehicleId') vehicleId?: string,
  ) {
    return this.fuelService.findAll({ agencyId, vehicleId });
  }

  @Get('fuel-transactions/:id')
  @ApiOperation({ summary: 'Get fuel transaction by ID' })
  findOne(@Param('id') id: string) {
    return this.fuelService.findOne(id);
  }

  @Patch('fuel-transactions/:id')
  @ApiOperation({ summary: 'Update fuel transaction' })
  update(@Param('id') id: string, @Body() dto: UpdateFuelTransactionDto) {
    return this.fuelService.update(id, dto);
  }
}