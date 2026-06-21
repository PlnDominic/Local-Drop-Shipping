import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from './entities/order.entity';
import { OrdersService } from './orders.service';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('dropshipper')
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: JwtPayload) {
    return this.ordersService.create(dto, user.sub);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('dropshipper')
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.ordersService.findAll(user.sub, +page, +limit);
  }

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles('admin')
  adminListAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.ordersService.adminListAll(+page, +limit);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('dropshipper')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.ordersService.findOne(id, user.sub);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('admin', 'supplier')
  updateStatus(@Param('id') id: string, @Body('status') status: OrderStatus) {
    return this.ordersService.updateStatus(id, status);
  }
}
