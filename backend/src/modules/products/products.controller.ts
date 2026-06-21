import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('category') categoryId?: string,
  ) {
    return this.productsService.findAll(+page, +limit, categoryId);
  }

  @Get('search')
  search(@Query('q') q: string) {
    return this.productsService.search(q ?? '');
  }

  @Get('category/:slug')
  findByCategory(@Param('slug') slug: string) {
    return this.productsService.findByCategory(slug);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('supplier')
  create(@Body() dto: CreateProductDto, @CurrentUser() user: JwtPayload) {
    return this.productsService.create(dto, user.sub);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('supplier')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.productsService.update(id, dto, user.sub);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('supplier')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.productsService.remove(id, user.sub);
  }
}
