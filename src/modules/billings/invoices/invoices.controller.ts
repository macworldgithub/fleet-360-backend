import { Controller, Get, Post, Body, Param, Req, UseGuards } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { Invoice } from './invoice.schema';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@ApiTags('Invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invService: InvoicesService) {}

  @Post()
  @ApiOperation({ summary: 'Create an invoice' })
  create(@Body() body: Partial<Invoice>) {
    return this.invService.create(body);
  }

  @Get()
  @ApiOperation({ summary: 'Get all invoices' })
  findAll(@Req() req) {
    const agencyId = req.user.agencyId;
    const role = req.user.role;
    return this.invService.findAll(agencyId, role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice by ID' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  findOne(@Req() req, @Param('id') id: string) {
    const agencyId = req.user.agencyId;
    const role = req.user.role;
    return this.invService.findOne(id, agencyId, role);
  }
}