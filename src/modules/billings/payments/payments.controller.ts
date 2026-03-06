// payments.controller.ts
import { Controller, Get, Param } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  findAll() {
    return this.paymentsService.findAllWithSubscription();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOneWithSubscription(id);
  }
}