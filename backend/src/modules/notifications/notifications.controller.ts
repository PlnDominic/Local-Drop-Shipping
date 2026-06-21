import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { NotificationsService, SendNotificationDto } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.notificationsService.listForUser(user.sub, +page, +limit);
  }

  @Post('send')
  @UseGuards(RolesGuard)
  @Roles('admin')
  send(@Body() dto: SendNotificationDto) {
    return this.notificationsService.send(dto);
  }
}
