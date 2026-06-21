import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateDropshipperProfileDto } from './dto/create-dropshipper-profile.dto';
import { ImportProductDto } from './dto/import-product.dto';
import { DroppshippersService } from './dropshippers.service';

@Controller('dropshippers')
@UseGuards(JwtAuthGuard)
export class DroppshippersController {
  constructor(private readonly droppshippersService: DroppshippersService) {}

  @Get('me')
  @UseGuards(RolesGuard)
  @Roles('dropshipper')
  getProfile(@CurrentUser() user: JwtPayload) {
    return this.droppshippersService.getProfile(user.sub);
  }

  @Post('me')
  @UseGuards(RolesGuard)
  @Roles('dropshipper')
  upsertProfile(@CurrentUser() user: JwtPayload, @Body() dto: CreateDropshipperProfileDto) {
    return this.droppshippersService.upsertProfile(user.sub, dto);
  }

  @Post('me/products')
  @UseGuards(RolesGuard)
  @Roles('dropshipper')
  importProduct(@CurrentUser() user: JwtPayload, @Body() dto: ImportProductDto) {
    return this.droppshippersService.importProduct(user.sub, dto);
  }

  @Get('me/products')
  @UseGuards(RolesGuard)
  @Roles('dropshipper')
  listImportedProducts(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.droppshippersService.listImportedProducts(user.sub, +page, +limit);
  }

  @Delete('me/products/:productId')
  @UseGuards(RolesGuard)
  @Roles('dropshipper')
  removeImportedProduct(@CurrentUser() user: JwtPayload, @Param('productId') productId: string) {
    return this.droppshippersService.removeImportedProduct(user.sub, productId);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin')
  listAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.droppshippersService.listAll(+page, +limit);
  }
}
