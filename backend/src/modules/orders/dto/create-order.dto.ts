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
  // Accepted for backward compatibility but IGNORED: the unit price is resolved
  // server-side from dropshipper_products.custom_price to prevent price tampering.
  @IsOptional() @IsNumber() @IsPositive() unitPrice?: number;
}

export class CreateOrderDto {
  @IsString() @MinLength(2) customerName: string = '';
  @IsString() customerPhone: string = '';
  @IsString() @MinLength(5) customerAddress: string = '';
  @IsArray() @ValidateNested({ each: true }) @Type(() => OrderItemDto) items: OrderItemDto[] = [];
  @IsOptional() @IsString() notes?: string;
}
