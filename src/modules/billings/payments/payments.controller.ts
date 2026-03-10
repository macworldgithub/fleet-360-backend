import { Controller, Get, Post, Body, Param, Req, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Payment } from './payment.schema';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payService: PaymentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a payment record' })
  create(@Body() body: Partial<Payment>) {
    return this.payService.create(body);
  }

  @Get()
  @ApiOperation({ summary: 'Get all payments with subscription details' })
  findAll(@Req() req) {
    const agencyId = req.user.agencyId;
    const role = req.user.role;
    return this.payService.findAllWithSubscription(agencyId, role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  findOne(@Req() req, @Param('id') id: string) {
    const agencyId = req.user.agencyId;
    const role = req.user.role;
    return this.payService.findOneWithSubscription(id, agencyId, role);
  }
}