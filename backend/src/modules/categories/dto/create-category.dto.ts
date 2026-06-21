import { IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @IsString() @MinLength(2) name: string = '';
  @IsString() @MinLength(2) slug: string = '';
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsUrl() imageUrl?: string;
}
