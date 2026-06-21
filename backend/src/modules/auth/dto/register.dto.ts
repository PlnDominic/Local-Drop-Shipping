import { IsEmail, IsEnum, IsString, MinLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsString()
  fullName: string = '';

  @IsEmail()
  email: string = '';

  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/, { message: 'Invalid phone number format.' })
  phone: string = '';

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters.' })
  password: string = '';

  @IsEnum(['customer', 'dropshipper', 'supplier'])
  role: 'customer' | 'dropshipper' | 'supplier' = 'customer';
}
