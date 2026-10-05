import type { Metadata } from 'next';
import { Wishlist } from '../views/Wishlist';

// Pre-launch: the homepage collects wishlist emails. The marketplace lives at /marketplace.
export const metadata: Metadata = {
  title: 'Local Drop Shipping GH - Launching Soon. Join the Wishlist',
  description:
    'Local Drop Shipping GH is launching soon. Dropshippers and suppliers in Ghana: join the wishlist and get an invite to create your account on launch day.',
  alternates: { canonical: 'https://www.localdropshippinggh.com/' },
};

export default function Page() {
  return <Wishlist />;
}
