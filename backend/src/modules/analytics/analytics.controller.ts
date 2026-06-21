import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('admin/summary')
  @Roles('admin')
  adminSummary() {
    return this.analyticsService.getAdminSummary();
  }

  @Get('admin/revenue')
  @Roles('admin')
  revenueSeries(@Query('days') days = 30) {
    return this.analyticsService.getRevenueSeries(+days);
  }

  @Get('admin/top-products')
  @Roles('admin')
  topProducts(@Query('limit') limit = 10) {
    return this.analyticsService.getTopProducts(+limit);
  }

  @Get('dropshipper/summary')
  @Roles('dropshipper')
  dropshipperSummary(@CurrentUser() user: JwtPayload) {
    return this.analyticsService.getDropshipperSummary(user.sub);
  }

  @Get('supplier/summary')
  @Roles('supplier')
  supplierSummary(@CurrentUser() user: JwtPayload) {
    return this.analyticsService.getSupplierSummary(user.sub);
  }
}
