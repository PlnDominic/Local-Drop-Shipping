import type { Metadata } from 'next';
import { SITE } from '../../lib/site';

export const metadata: Metadata = {
  title: 'Marketplace - Local Drop Shipping GH',
  description: 'Shop products from local Ghanaian suppliers and dropshippers, delivered across all 16 regions with GhanaPost GPS addresses.',
  alternates: { canonical: `${SITE.url}/marketplace` },
};

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
