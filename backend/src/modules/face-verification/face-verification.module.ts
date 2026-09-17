import { Module } from '@nestjs/common';
import { FaceVerificationService } from './face-verification.service';
import { FaceVerificationController } from './face-verification.controller';

@Module({
  controllers: [FaceVerificationController],
  providers: [FaceVerificationService],
  exports: [FaceVerificationService],
})
export class FaceVerificationModule {}