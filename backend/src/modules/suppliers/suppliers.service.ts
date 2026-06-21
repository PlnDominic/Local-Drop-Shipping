import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { CreateSupplierProfileDto } from './dto/create-supplier-profile.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly supabase: SupabaseService) {}

  async getProfile(userId: string) {
    const { data, error } = await this.supabase.db
      .from('supplier_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error || !data) throw new NotFoundException('Supplier profile not found.');
    return data;
  }

  async upsertProfile(userId: string, dto: CreateSupplierProfileDto) {
    const { data, error } = await this.supabase.db
      .from('supplier_profiles')
      .upsert(
        {
          user_id: userId,
          business_name: dto.businessName,
          description: dto.description ?? null,
          logo_url: dto.logoUrl ?? null,
          location: dto.location ?? null,
          ghana_post_gps: dto.ghanaPostGps ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async listProducts(supplierId: string, page = 1, limit = 20) {
    const from = (page - 1) * limit;
    const { data, count, error } = await this.supabase.db
      .from('products')
      .select('*', { count: 'exact' })
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);
    if (error) throw new Error(error.message);
    return { items: data ?? [], total: count ?? 0, page, limit };
  }

  async listOrders(supplierId: string, page = 1, limit = 20) {
    const from = (page - 1) * limit;
    const { data, count, error } = await this.supabase.db
      .from('order_items')
      .select('*, orders(*), products!inner(supplier_id)', { count: 'exact' })
      .eq('products.supplier_id', supplierId)
      .range(from, from + limit - 1);
    if (error) throw new Error(error.message);
    return { items: data ?? [], total: count ?? 0, page, limit };
  }

  async listAll(page = 1, limit = 20) {
    const from = (page - 1) * limit;
    const { data, count, error } = await this.supabase.db
      .from('supplier_profiles')
      .select('*, users(full_name, email)', { count: 'exact' })
      .range(from, from + limit - 1);
    if (error) throw new Error(error.message);
    return { items: data ?? [], total: count ?? 0, page, limit };
  }
}
