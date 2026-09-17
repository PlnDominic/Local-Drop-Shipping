import { IsBase64, IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator';

export type FaceVerificationProvider = 'simulated' | 'facepp' | 'aws-rekognition' | 'azure-face';

export class VerifyFaceDto {
  @IsString()
  @IsBase64()
  image: string; // base64-encoded image (data URL stripped)

  @IsOptional()
  @IsEnum(['simulated', 'facepp', 'aws-rekognition', 'azure-face'])
  provider?: FaceVerificationProvider;
}