import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly supabase: SupabaseService) {}

  async getAdminSummary() {
    const [usersRes, ordersRes, revenueRes, productsRes] = await Promise.all([
      this.supabase.db.from('users').select('id', { count: 'exact', head: true }),
      this.supabase.db.from('orders').select('id', { count: 'exact', head: true }),
      this.supabase.db
        .from('orders')
        .select('total')
        .in('status', ['delivered', 'confirmed']),
      this.supabase.db.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
    ]);

    const totalRevenue = (revenueRes.data ?? []).reduce(
      (sum: number, o: { total: number }) => sum + Number(o.total),
      0,
    );

    return {
      totalUsers: usersRes.count ?? 0,
      totalOrders: ordersRes.count ?? 0,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      activeProducts: productsRes.count ?? 0,
    };
  }

  async getRevenueSeries(days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await this.supabase.db
      .from('orders')
      .select('total, created_at')
      .in('status', ['delivered', 'confirmed'])
      .gte('created_at', since)
      .order('created_at');

    const byDay: Record<string, number> = {};
    for (const row of data ?? []) {
      const day = (row.created_at as string).slice(0, 10);
      byDay[day] = (byDay[day] ?? 0) + Number(row.total);
    }

    return Object.entries(byDay).map(([date, revenue]) => ({ date, revenue }));
  }

  async getTopProducts(limit = 10) {
    const { data } = await this.supabase.db
      .from('order_items')
      .select('product_id, products(name), quantity')
      .order('quantity', { ascending: false })
      .limit(limit * 5);

    const totals: Record<string, { name: string; quantity: number }> = {};
    for (const row of data ?? []) {
      const id = row.product_id as string;
      const name = (row.products as unknown as { name: string } | null)?.name ?? id;
      if (!totals[id]) totals[id] = { name, quantity: 0 };
      totals[id].quantity += Number(row.quantity);
    }

    return Object.entries(totals)
      .sort((a, b) => b[1].quantity - a[1].quantity)
      .slice(0, limit)
      .map(([productId, v]) => ({ productId, ...v }));
  }

  async getDropshipperSummary(dropshipperId: string) {
    const [ordersRes, revenueRes] = await Promise.all([
      this.supabase.db
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('dropshipper_id', dropshipperId),
      this.supabase.db
        .from('orders')
        .select('total')
        .eq('dropshipper_id', dropshipperId)
        .in('status', ['delivered', 'confirmed']),
    ]);

    const totalRevenue = (revenueRes.data ?? []).reduce(
      (sum: number, o: { total: number }) => sum + Number(o.total),
      0,
    );

    return {
      totalOrders: ordersRes.count ?? 0,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
    };
  }

  async getSupplierSummary(supplierId: string) {
    const { data: products, count: productCount } = await this.supabase.db
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('supplier_id', supplierId)
      .eq('is_active', true);

    void products;

    return {
      activeProducts: productCount ?? 0,
    };
  }
}
