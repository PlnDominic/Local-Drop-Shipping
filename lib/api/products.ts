import { api } from './client';
import type {
  CreateProductPayload,
  PaginatedData,
  Product,
  ProductsQuery,
  UpdateProductPayload,
} from './types';

export const productsApi = {
  /** [Public] List all products with optional pagination & category filter */
  list: (query: ProductsQuery = {}): Promise<PaginatedData<Product>> =>
    api.get<PaginatedData<Product>>('/products', {
      params: query as Record<string, string | number | boolean | undefined>,
      skipAuth: true,
    }),

  /** [Public] Get a single product by ID */
  getById: (id: string): Promise<Product> =>
    api.get<Product>(`/products/${id}`, { skipAuth: true }),

  /** [Public] Full-text search across products */
  search: (q: string): Promise<Product[]> =>
    api.get<Product[]>('/products/search', { params: { q }, skipAuth: true }),

  /** [Public] List products belonging to a category slug */
  listByCategory: (slug: string): Promise<Product[]> =>
    api.get<Product[]>(`/products/category/${slug}`, { skipAuth: true }),

  /** [Supplier] Create a new wholesale product */
  create: (payload: CreateProductPayload): Promise<Product> =>
    api.post<Product>('/products', payload),

  /** [Supplier] Update an existing product */
  update: (id: string, payload: UpdateProductPayload): Promise<Product> =>
    api.put<Product>(`/products/${id}`, payload),

  /** [Supplier] Delete / deactivate a product */
  remove: (id: string): Promise<{ message: string }> =>
    api.del<{ message: string }>(`/products/${id}`),
};
