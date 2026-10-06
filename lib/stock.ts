export interface StockInfo {
  stockQty: number;
  lowStockThreshold?: number;
  variants: { stockQty: number }[];
}

export type StockLevel = 'out' | 'low' | 'ok';

/** Units on hand: the sum of the options when a product has them, otherwise its own count. */
export function totalStock(p: StockInfo): number {
  return p.variants.length > 0 ? p.variants.reduce((n, v) => n + Math.max(0, v.stockQty), 0) : p.stockQty;
}

export function stockLevel(p: StockInfo): StockLevel {
  const total = totalStock(p);
  if (total <= 0) return 'out';
  return total <= (p.lowStockThreshold ?? 5) ? 'low' : 'ok';
}
