import { IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class CreateDropshipperProfileDto {
  @IsString() @MinLength(2) businessName: string = '';
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsUrl() logoUrl?: string;
  @IsOptional() @IsString() location?: string;
}
