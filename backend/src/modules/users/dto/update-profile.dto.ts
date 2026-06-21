import { IsOptional, IsString, IsUrl, Matches } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/, { message: 'Invalid phone number.' })
  phone?: string;

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}
