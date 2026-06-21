import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly supabase: SupabaseService) {}

  async findAll(page: number, limit: number, categoryId?: string) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = this.supabase.db
      .from('products')
      .select('*, supplier_profiles(business_name)', { count: 'exact' })
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (categoryId) query = query.eq('category_id', categoryId);

    const { data, count, error } = await query;
    if (error) throw new Error(error.message);

    return {
      items: data ?? [],
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    };
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase.db
      .from('products')
      .select('*, supplier_profiles(*), categories(name, slug)')
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException(`Product ${id} not found.`);
    return data;
  }

  async search(queryText: string) {
    const { data, error } = await this.supabase.db
      .from('products')
      .select('*')
      .ilike('name', `%${queryText}%`)
      .eq('is_active', true)
      .limit(50);

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async findByCategory(slug: string) {
    const { data: category } = await this.supabase.db
      .from('categories')
      .select('id')
      .eq('slug', slug)
      .single();

    if (!category) throw new NotFoundException(`Category '${slug}' not found.`);

    const { data, error } = await this.supabase.db
      .from('products')
      .select('*')
      .eq('category_id', category.id)
      .eq('is_active', true);

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async create(dto: CreateProductDto, supplierId: string) {
    const { data, error } = await this.supabase.db
      .from('products')
      .insert({
        category_id: dto.categoryId,
        name: dto.name,
        description: dto.description,
        images: dto.images,
        cost_price: dto.costPrice,
        suggested_price: dto.suggestedPrice,
        stock_qty: dto.stockQty,
        sku: dto.sku,
        supplier_id: supplierId,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async update(id: string, dto: UpdateProductDto, supplierId: string) {
    await this.verifyOwnership(id, supplierId);

    const fields: Record<string, unknown> = {};
    if (dto.name !== undefined) fields['name'] = dto.name;
    if (dto.description !== undefined) fields['description'] = dto.description;
    if (dto.images !== undefined) fields['images'] = dto.images;
    if (dto.costPrice !== undefined) fields['cost_price'] = dto.costPrice;
    if (dto.suggestedPrice !== undefined) fields['suggested_price'] = dto.suggestedPrice;
    if (dto.stockQty !== undefined) fields['stock_qty'] = dto.stockQty;
    if (dto.isActive !== undefined) fields['is_active'] = dto.isActive;

    const { data, error } = await this.supabase.db
      .from('products')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async remove(id: string, supplierId: string) {
    await this.verifyOwnership(id, supplierId);

    const { error } = await this.supabase.db
      .from('products')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw new Error(error.message);
    return { message: 'Product deactivated.' };
  }

  private async verifyOwnership(productId: string, supplierId: string) {
    const { data } = await this.supabase.db
      .from('products')
      .select('supplier_id')
      .eq('id', productId)
      .single();

    if (!data) throw new NotFoundException('Product not found.');
    if (data.supplier_id !== supplierId) {
      throw new UnauthorizedException('You do not own this product.');
    }
  }
}
