import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { OfficesService } from '../offices.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CreateOfficeDto } from './create-office.dto';
import { UpdateOfficeDto } from './update-office.dto';

@ApiTags('Offices')
@Controller()
export class OfficesController {
  constructor(private readonly officesService: OfficesService) {}

  // ===== List all offices for an agency =====
  @Get('api/agencies/:agencyId/offices')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all offices of an agency' })
  @ApiParam({ name: 'agencyId', description: 'ID of the agency' })
  findByAgency(@Param('agencyId') agencyId: string) {
    return this.officesService.findByAgency(agencyId);
  }

  // ===== Create office for an agency =====
  @Post('api/agencies/:agencyId/offices')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new office for an agency' })
  @ApiParam({ name: 'agencyId', description: 'ID of the agency' })
  @ApiBody({ type: CreateOfficeDto, description: 'Office data' })
  create(@Param('agencyId') agencyId: string, @Body() dto: CreateOfficeDto) {
    return this.officesService.create(agencyId, dto);
  }

  // ===== Get single office =====
  @Get('api/offices/:officeId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get office by ID' })
  @ApiParam({ name: 'officeId', description: 'ID of the office' })
  findOne(@Param('officeId') officeId: string) {
    return this.officesService.findById(officeId);
  }

  // ===== Update office =====
  @Patch('api/offices/:officeId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update office by ID' })
  @ApiParam({ name: 'officeId', description: 'ID of the office' })
  @ApiBody({ type: UpdateOfficeDto, description: 'Fields to update' })
  update(@Param('officeId') officeId: string, @Body() dto: UpdateOfficeDto) {
    return this.officesService.updateById(officeId, dto);
  }

  // ===== Delete office =====
  @Delete('api/offices/:officeId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete office by ID' })
  @ApiParam({ name: 'officeId', description: 'ID of the office' })
  remove(@Param('officeId') officeId: string) {
    return this.officesService.deleteById(officeId);
  }
}
