import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateSupplierProfileDto } from './dto/create-supplier-profile.dto';
import { SuppliersService } from './suppliers.service';

@Controller('suppliers')
@UseGuards(JwtAuthGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get('me')
  @UseGuards(RolesGuard)
  @Roles('supplier')
  getProfile(@CurrentUser() user: JwtPayload) {
    return this.suppliersService.getProfile(user.sub);
  }

  @Post('me')
  @UseGuards(RolesGuard)
  @Roles('supplier')
  upsertProfile(@CurrentUser() user: JwtPayload, @Body() dto: CreateSupplierProfileDto) {
    return this.suppliersService.upsertProfile(user.sub, dto);
  }

  @Get('me/products')
  @UseGuards(RolesGuard)
  @Roles('supplier')
  listProducts(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.suppliersService.listProducts(user.sub, +page, +limit);
  }

  @Get('me/orders')
  @UseGuards(RolesGuard)
  @Roles('supplier')
  listOrders(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.suppliersService.listOrders(user.sub, +page, +limit);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin')
  listAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.suppliersService.listAll(+page, +limit);
  }
}
