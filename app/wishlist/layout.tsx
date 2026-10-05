import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Join the Wishlist - Local Drop Shipping GH',
  description:
    'Dropshippers and suppliers in Ghana: join the Local Drop Shipping GH wishlist and get an invite to create your account on launch day.',
  alternates: { canonical: 'https://www.localdropshippinggh.com/' },
  openGraph: {
    title: 'Local Drop Shipping GH is launching soon',
    description: 'Dropship or supply products across Ghana. Join the wishlist for early access.',
    url: 'https://www.localdropshippinggh.com/',
    type: 'website',
  },
};

export default function WishlistLayout({ children }: { children: React.ReactNode }) {
  return children;
}
