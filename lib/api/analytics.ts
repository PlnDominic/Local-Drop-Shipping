import { api } from './client';
import type {
  AnalyticsSummary,
  OrdersChartPoint,
  RevenueDataPoint,
  TopProduct,
} from './types';

type RangeParam = '7d' | '30d' | '90d' | '1y';

export const analyticsApi = {
  /** High-level KPI summary (revenue, orders, customers, etc.) */
  getSummary: (): Promise<AnalyticsSummary> =>
    api.get<AnalyticsSummary>('/analytics/summary'),

  /** Daily revenue over a rolling window */
  getRevenue: (range: RangeParam = '30d'): Promise<RevenueDataPoint[]> =>
    api.get<RevenueDataPoint[]>('/analytics/revenue', { params: { range } }),

  /** Best-performing products by units sold and revenue */
  getTopProducts: (): Promise<TopProduct[]> =>
    api.get<TopProduct[]>('/analytics/top-products'),

  /** Order status breakdown over time (for charts) */
  getOrdersChart: (range: RangeParam = '30d'): Promise<OrdersChartPoint[]> =>
    api.get<OrdersChartPoint[]>('/analytics/orders-chart', { params: { range } }),
};
