import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @IsUUID() productId: string = '';
  @IsInt() @Min(1) quantity: number = 1;
  @IsNumber() @IsPositive() unitPrice: number = 0;
}

export class CreateOrderDto {
  @IsString() @MinLength(2) customerName: string = '';
  @IsString() customerPhone: string = '';
  @IsString() @MinLength(5) customerAddress: string = '';
  @IsArray() @ValidateNested({ each: true }) @Type(() => OrderItemDto) items: OrderItemDto[] = [];
  @IsOptional() @IsString() notes?: string;
}
