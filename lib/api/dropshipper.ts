import { api } from './client';
import type {
  DropshipperProduct,
  DropshipperStore,
  ImportProductPayload,
  UpdateDropshipperStorePayload,
  UpdateImportedPricePayload,
} from './types';

export const dropshipperApi = {
  // ── Imported products ────────────────────────────────────────────────────

  /** Import a supplier product into the dropshipper's store */
  importProduct: (payload: ImportProductPayload): Promise<DropshipperProduct> =>
    api.post<DropshipperProduct>('/dropshipper/products/import', payload),

  /** List all imported products in the dropshipper's store */
  listProducts: (): Promise<DropshipperProduct[]> =>
    api.get<DropshipperProduct[]>('/dropshipper/products'),

  /** Update selling price, description, or publish status of an imported product */
  updateProduct: (
    id: string,
    payload: UpdateImportedPricePayload,
  ): Promise<DropshipperProduct> =>
    api.patch<DropshipperProduct>(`/dropshipper/products/${id}/price`, payload),

  /** Remove an imported product from the dropshipper's store */
  removeProduct: (id: string): Promise<{ message: string }> =>
    api.del<{ message: string }>(`/dropshipper/products/${id}`),

  // ── Store settings ────────────────────────────────────────────────────────

  /** Get the dropshipper's store profile */
  getStore: (): Promise<DropshipperStore> =>
    api.get<DropshipperStore>('/dropshipper/store'),

  /** Update store name, description, or logo */
  updateStore: (payload: UpdateDropshipperStorePayload): Promise<DropshipperStore> =>
    api.patch<DropshipperStore>('/dropshipper/store', payload),
};
