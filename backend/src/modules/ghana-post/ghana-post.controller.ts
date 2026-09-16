import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GhanaPostService, GhanaPostSuggestion } from './ghana-post.service';

@Controller('v1/ghana-post')
@UseGuards(JwtAuthGuard)
export class GhanaPostController {
  constructor(private readonly ghanaPostService: GhanaPostService) {}

  @Post('validate')
  async validate(
    @Body('gps_address') gpsAddress: string,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!gpsAddress || typeof gpsAddress !== 'string') {
      return {
        valid: false,
        gpsAddress: '',
        region: null,
        city: null,
        street: null,
        confidence: 0,
        message: 'GPS address is required.',
      };
    }

    return this.ghanaPostService.validateAddress(gpsAddress);
  }

  @Get('autocomplete')
  async autocomplete(
    @Query('q') query: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<GhanaPostSuggestion[]> {
    return this.ghanaPostService.autocomplete(query ?? '');
  }
}
