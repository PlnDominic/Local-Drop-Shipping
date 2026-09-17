import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { VerifyFaceDto } from './dto/verify-face.dto';
import { FaceVerificationService } from './face-verification.service';

@Controller('face-verification')
@UseGuards(JwtAuthGuard)
export class FaceVerificationController {
  constructor(private readonly faceVerificationService: FaceVerificationService) {}

  @Post('verify')
  @UseGuards(RolesGuard)
  @Roles('dropshipper')
  async verifyFace(
    @CurrentUser() user: JwtPayload,
    @Body() dto: VerifyFaceDto,
  ) {
    return this.faceVerificationService.verifyFace(user.sub, dto);
  }

  @Get('status')
  @UseGuards(RolesGuard)
  @Roles('dropshipper')
  async getVerificationStatus(@CurrentUser() user: JwtPayload) {
    return this.faceVerificationService.getVerificationStatus(user.sub);
  }
}