import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  getProfile(@CurrentUser() user: JwtPayload) {
    return this.usersService.getProfile(user.sub);
  }

  @Patch('profile')
  updateProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.sub, dto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin')
  listUsers(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.usersService.listUsers(+page, +limit);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  getUserById(@Param('id') id: string) {
    return this.usersService.getUserById(id);
  }
}
