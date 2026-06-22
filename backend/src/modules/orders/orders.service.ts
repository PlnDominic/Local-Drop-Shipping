import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
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
    if (!dto.items.length) throw new BadRequestException('Order must contain at least one item.');

    // Resolve authoritative unit prices server-side. The customer pays the price
    // the dropshipper set when importing the product (dropshipper_products.custom_price).
    // Client-supplied unitPrice values are never trusted.
    const productIds = [...new Set(dto.items.map((i) => i.productId))];

    const { data: imported, error: importErr } = await this.supabase.db
      .from('dropshipper_products')
      .select('product_id, custom_price')
      .eq('dropshipper_id', dropshipperId)
      .in('product_id', productIds);

    if (importErr) throw new Error(importErr.message);

    const priceByProduct = new Map<string, number>(
      (imported ?? []).map((row) => [row.product_id as string, Number(row.custom_price)]),
    );

    // Every ordered product must be imported by this dropshipper and have a valid price.
    for (const id of productIds) {
      const price = priceByProduct.get(id);
      if (price === undefined || !(price > 0)) {
        throw new BadRequestException(`Product ${id} is not available in your store.`);
      }
    }

    const pricedItems = dto.items.map((i) => {
      const unitPrice = priceByProduct.get(i.productId)!;
      return {
        product_id: i.productId,
        quantity: i.quantity,
        unit_price: unitPrice,
        subtotal: parseFloat((unitPrice * i.quantity).toFixed(2)),
      };
    });

    const subtotal = parseFloat(
      pricedItems.reduce((sum, i) => sum + i.subtotal, 0).toFixed(2),
    );
    const platformFee = parseFloat(((subtotal * this.platformFeePercent) / 100).toFixed(2));
    const total = parseFloat((subtotal + platformFee).toFixed(2));

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

    const items = pricedItems.map((i) => ({ order_id: order.id, ...i }));

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

  async updateStatus(id: string, status: OrderStatus, user: JwtPayload) {
    const allowed: OrderStatus[] = ['confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    if (!allowed.includes(status)) throw new BadRequestException('Invalid status.');

    // Suppliers may only progress fulfillment, and only on orders that contain
    // at least one of their own products. Admins may set any status.
    if (user.role === 'supplier') {
      const supplierStatuses: OrderStatus[] = ['processing', 'shipped', 'delivered'];
      if (!supplierStatuses.includes(status)) {
        throw new ForbiddenException('Suppliers may only update fulfillment status.');
      }
      await this.assertSupplierOwnsOrder(id, user.sub);
    }

    const { data, error } = await this.supabase.db
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) throw new NotFoundException(`Order ${id} not found.`);
    return data;
  }

  /** Ensures the order contains at least one product belonging to this supplier. */
  private async assertSupplierOwnsOrder(orderId: string, supplierId: string) {
    const { data: items, error } = await this.supabase.db
      .from('order_items')
      .select('products(supplier_id)')
      .eq('order_id', orderId);

    if (error) throw new Error(error.message);

    const ownsAny = (items ?? []).some((row) => {
      const product = (row as { products?: { supplier_id?: string } | { supplier_id?: string }[] }).products;
      const list = Array.isArray(product) ? product : product ? [product] : [];
      return list.some((p) => p.supplier_id === supplierId);
    });

    if (!ownsAny) {
      throw new ForbiddenException('You can only update orders containing your products.');
    }
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
