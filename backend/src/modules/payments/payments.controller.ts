import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PaymentChannel, PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate')
  @UseGuards(JwtAuthGuard)
  initiate(
    @CurrentUser() user: JwtPayload,
    @Body('orderId') orderId: string,
    @Body('channel') channel: PaymentChannel,
    @Body('email') email?: string,
    @Body('phone') phone?: string,
  ) {
    return this.paymentsService.initiate(orderId, channel, user.sub, email, phone);
  }

  @Post('verify/:reference')
  @UseGuards(JwtAuthGuard)
  verify(@Param('reference') reference: string, @CurrentUser() user: JwtPayload) {
    return this.paymentsService.verify(reference, user.sub);
  }

  @Post('webhook')
  webhook(
    @Body() payload: Record<string, unknown>,
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-paystack-signature') signature?: string,
  ) {
    return this.paymentsService.webhook(payload, req.rawBody, signature);
  }

  @Get('order/:orderId')
  @UseGuards(JwtAuthGuard)
  listForOrder(@Param('orderId') orderId: string, @CurrentUser() user: JwtPayload) {
    return this.paymentsService.listForOrder(orderId, user.sub);
  }
}
