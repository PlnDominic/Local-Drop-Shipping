import { IsArray, IsNumber, IsPositive, IsString, IsUrl, Min, MinLength } from 'class-validator';

export class CreateProductDto {
  @IsString()
  categoryId: string = '';

  @IsString()
  @MinLength(3)
  name: string = '';

  @IsString()
  description: string = '';

  @IsArray()
  @IsUrl({}, { each: true })
  images: string[] = [];

  @IsNumber()
  @IsPositive()
  costPrice: number = 0;

  @IsNumber()
  @IsPositive()
  suggestedPrice: number = 0;

  @IsNumber()
  @Min(0)
  stockQty: number = 0;

  @IsString()
  sku: string = '';
}
