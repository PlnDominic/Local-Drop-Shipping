import type { Metadata } from 'next';
import { Wishlist } from '../views/Wishlist';

// Pre-launch: the homepage collects wishes. The marketplace lives at /marketplace.
export const metadata: Metadata = {
  title: 'Local Drop Shipping GH - What do you wish we sold in Ghana?',
  description:
    'Local Drop Shipping GH is launching soon. Tell us the products, suppliers and features you want, and upvote what others wish for. The most-wanted items get sourced first.',
  alternates: { canonical: 'https://www.localdropshippinggh.com/' },
};

export default function Page() {
  return <Wishlist />;
}
