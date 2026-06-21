import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { MoMoProvider } from './providers/momo.provider';
import { PaystackProvider } from './providers/paystack.provider';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, PaystackProvider, MoMoProvider],
  exports: [PaymentsService],
})
export class PaymentsModule {}
