import { IsNumber, IsOptional, IsPositive, IsUUID } from 'class-validator';

export class ImportProductDto {
  @IsUUID() productId: string = '';
  @IsOptional() @IsNumber() @IsPositive() customPrice?: number;
}
