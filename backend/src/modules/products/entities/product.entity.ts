export interface ProductEntity {
  id: string;
  supplier_id: string;
  category_id: string;
  name: string;
  description: string;
  images: string[];
  cost_price: number;
  suggested_price: number;
  stock_qty: number;
  sku: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
