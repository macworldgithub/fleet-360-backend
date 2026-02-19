import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { KmLogsService } from './km-logs.service';
import { CreateKmLogDto } from './dto/create-km-log.dto';
import { UpdateKmLogDto } from './dto/update-km-log.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@ApiTags('KM Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/km-logs')
export class KmLogsController {
  constructor(private readonly kmLogsService: KmLogsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a KM log (Trip log)' })
  create(@Body() dto: CreateKmLogDto) {
    return this.kmLogsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all KM logs (Trips)' })
  @ApiQuery({ name: 'vehicleId', required: false })
  @ApiQuery({ name: 'agencyId', required: false })
  @ApiQuery({ name: 'officeId', required: false })
  @ApiQuery({ name: 'tripType', required: false })
  @ApiQuery({ name: 'fromDate', required: false, example: '2026-02-01' })
  @ApiQuery({ name: 'toDate', required: false, example: '2026-02-18' })
  findAll(
    @Query('vehicleId') vehicleId?: string,
    @Query('agencyId') agencyId?: string,
    @Query('officeId') officeId?: string,
    @Query('tripType') tripType?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.kmLogsService.findAll({
      vehicleId,
      agencyId,
      officeId,
      tripType,
      fromDate,
      toDate,
    });
  }

  @Get(':logId')
  @ApiOperation({ summary: 'Get KM log by ID' })
  @ApiParam({ name: 'logId', description: 'KM Log ID' })
  findOne(@Param('logId') logId: string) {
    return this.kmLogsService.findOne(logId);
  }

  @Patch(':logId')
  @ApiOperation({ summary: 'Update KM log by ID' })
  @ApiParam({ name: 'logId', description: 'KM Log ID' })
  update(@Param('logId') logId: string, @Body() dto: UpdateKmLogDto) {
    return this.kmLogsService.update(logId, dto);
  }

  @Delete(':logId')
  @ApiOperation({ summary: 'Delete KM log by ID' })
  @ApiParam({ name: 'logId', description: 'KM Log ID' })
  remove(@Param('logId') logId: string) {
    return this.kmLogsService.remove(logId);
  }
}
