import { IsArray, IsBoolean, IsNumber, IsOptional, IsPositive, IsString, IsUrl, Min } from 'class-validator';

export class UpdateProductDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() @IsUrl({}, { each: true }) images?: string[];
  @IsOptional() @IsNumber() @IsPositive() costPrice?: number;
  @IsOptional() @IsNumber() @IsPositive() suggestedPrice?: number;
  @IsOptional() @IsNumber() @Min(0) stockQty?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
