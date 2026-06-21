import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from './entities/order.entity';

@Injectable()
export class OrdersService {
  private readonly platformFeePercent: number;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly config: ConfigService,
  ) {
    this.platformFeePercent = this.config.get<number>('app.platformFeePercent') ?? 2;
  }

  async create(dto: CreateOrderDto, dropshipperId: string) {
    const subtotal = dto.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const platformFee = parseFloat(((subtotal * this.platformFeePercent) / 100).toFixed(2));
    const total = subtotal + platformFee;

    const { data: order, error: orderErr } = await this.supabase.db
      .from('orders')
      .insert({
        dropshipper_id: dropshipperId,
        customer_name: dto.customerName,
        customer_phone: dto.customerPhone,
        customer_address: dto.customerAddress,
        status: 'pending',
        subtotal,
        platform_fee: platformFee,
        total,
        notes: dto.notes ?? null,
      })
      .select()
      .single();

    if (orderErr) throw new Error(orderErr.message);

    const items = dto.items.map((i) => ({
      order_id: order.id,
      product_id: i.productId,
      quantity: i.quantity,
      unit_price: i.unitPrice,
      subtotal: i.unitPrice * i.quantity,
    }));

    const { error: itemsErr } = await this.supabase.db.from('order_items').insert(items);
    if (itemsErr) throw new Error(itemsErr.message);

    return { ...order, items };
  }

  async findAll(dropshipperId: string, page = 1, limit = 20) {
    const from = (page - 1) * limit;
    const { data, count, error } = await this.supabase.db
      .from('orders')
      .select('*, order_items(*)', { count: 'exact' })
      .eq('dropshipper_id', dropshipperId)
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    if (error) throw new Error(error.message);
    return { items: data ?? [], total: count ?? 0, page, limit };
  }

  async findOne(id: string, dropshipperId: string) {
    const { data, error } = await this.supabase.db
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', id)
      .eq('dropshipper_id', dropshipperId)
      .single();

    if (error || !data) throw new NotFoundException(`Order ${id} not found.`);
    return data;
  }

  async updateStatus(id: string, status: OrderStatus) {
    const allowed: OrderStatus[] = ['confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    if (!allowed.includes(status)) throw new BadRequestException('Invalid status.');

    const { data, error } = await this.supabase.db
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async adminListAll(page = 1, limit = 20) {
    const from = (page - 1) * limit;
    const { data, count, error } = await this.supabase.db
      .from('orders')
      .select('*, order_items(*), dropshipper_profiles(business_name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    if (error) throw new Error(error.message);
    return { items: data ?? [], total: count ?? 0, page, limit };
  }
}
