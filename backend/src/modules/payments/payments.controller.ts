import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PaymentChannel, PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate')
  @UseGuards(JwtAuthGuard)
  initiate(
    @Body('orderId') orderId: string,
    @Body('channel') channel: PaymentChannel,
    @Body('email') email?: string,
    @Body('phone') phone?: string,
  ) {
    return this.paymentsService.initiate(orderId, channel, email, phone);
  }

  @Post('verify/:reference')
  @UseGuards(JwtAuthGuard)
  verify(@Param('reference') reference: string) {
    return this.paymentsService.verify(reference);
  }

  @Post('webhook')
  webhook(@Body() payload: Record<string, unknown>) {
    return this.paymentsService.webhook(payload);
  }

  @Get('order/:orderId')
  @UseGuards(JwtAuthGuard)
  listForOrder(@Param('orderId') orderId: string) {
    return this.paymentsService.listForOrder(orderId);
  }
}
