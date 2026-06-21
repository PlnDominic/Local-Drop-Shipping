import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WalletService } from './wallet.service';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  getBalance(@CurrentUser() user: JwtPayload) {
    return this.walletService.getBalance(user.sub);
  }

  @Get('transactions')
  getTransactions(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.walletService.getTransactions(user.sub, +page, +limit);
  }

  @Post('withdraw')
  withdraw(
    @CurrentUser() user: JwtPayload,
    @Body('amount') amount: number,
    @Body('accountDetails') accountDetails: Record<string, string>,
  ) {
    return this.walletService.withdraw(user.sub, amount, accountDetails);
  }
}
