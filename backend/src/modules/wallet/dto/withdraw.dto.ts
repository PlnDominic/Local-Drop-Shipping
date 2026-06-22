import { IsNumber, IsObject, IsPositive, Max } from 'class-validator';

export class WithdrawDto {
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Amount must be a number with up to 2 decimals.' })
  @IsPositive({ message: 'Withdrawal amount must be greater than zero.' })
  @Max(1_000_000, { message: 'Withdrawal amount exceeds the allowed limit.' })
  amount: number = 0;

  @IsObject()
  accountDetails: Record<string, string> = {};
}
