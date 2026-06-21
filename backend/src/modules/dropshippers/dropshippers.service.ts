import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { CreateDropshipperProfileDto } from './dto/create-dropshipper-profile.dto';
import { ImportProductDto } from './dto/import-product.dto';

@Injectable()
export class DroppshippersService {
  constructor(private readonly supabase: SupabaseService) {}

  async getProfile(userId: string) {
    const { data, error } = await this.supabase.db
      .from('dropshipper_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error || !data) throw new NotFoundException('Dropshipper profile not found.');
    return data;
  }

  async upsertProfile(userId: string, dto: CreateDropshipperProfileDto) {
    const { data, error } = await this.supabase.db
      .from('dropshipper_profiles')
      .upsert(
        {
          user_id: userId,
          business_name: dto.businessName,
          description: dto.description ?? null,
          logo_url: dto.logoUrl ?? null,
          location: dto.location ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async importProduct(dropshipperId: string, dto: ImportProductDto) {
    const { data: existing } = await this.supabase.db
      .from('dropshipper_products')
      .select('id')
      .eq('dropshipper_id', dropshipperId)
      .eq('product_id', dto.productId)
      .maybeSingle();

    if (existing) throw new ConflictException('Product already imported.');

    const { data: product } = await this.supabase.db
      .from('products')
      .select('suggested_price')
      .eq('id', dto.productId)
      .single();

    if (!product) throw new NotFoundException('Product not found.');

    const { data, error } = await this.supabase.db
      .from('dropshipper_products')
      .insert({
        dropshipper_id: dropshipperId,
        product_id: dto.productId,
        custom_price: dto.customPrice ?? product.suggested_price,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async listImportedProducts(dropshipperId: string, page = 1, limit = 20) {
    const from = (page - 1) * limit;
    const { data, count, error } = await this.supabase.db
      .from('dropshipper_products')
      .select('*, products(*)', { count: 'exact' })
      .eq('dropshipper_id', dropshipperId)
      .range(from, from + limit - 1);
    if (error) throw new Error(error.message);
    return { items: data ?? [], total: count ?? 0, page, limit };
  }

  async removeImportedProduct(dropshipperId: string, productId: string) {
    const { error } = await this.supabase.db
      .from('dropshipper_products')
      .delete()
      .eq('dropshipper_id', dropshipperId)
      .eq('product_id', productId);
    if (error) throw new Error(error.message);
    return { message: 'Product removed from store.' };
  }

  async listAll(page = 1, limit = 20) {
    const from = (page - 1) * limit;
    const { data, count, error } = await this.supabase.db
      .from('dropshipper_profiles')
      .select('*, users(full_name, email)', { count: 'exact' })
      .range(from, from + limit - 1);
    if (error) throw new Error(error.message);
    return { items: data ?? [], total: count ?? 0, page, limit };
  }
}
