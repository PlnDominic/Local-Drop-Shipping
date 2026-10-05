import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Community Wishlist - Local Drop Shipping GH',
  description:
    'Tell us what you wish you could buy or sell in Ghana. Add products, suppliers and features to the Local Drop Shipping GH wishlist and upvote what others want.',
  alternates: { canonical: 'https://www.localdropshippinggh.com/' },
  openGraph: {
    title: 'What do you wish we sold? - Local Drop Shipping GH',
    description: 'Add your wish and upvote what others want. The most-wanted items get sourced first.',
    url: 'https://www.localdropshippinggh.com/',
    type: 'website',
  },
};

export default function WishlistLayout({ children }: { children: React.ReactNode }) {
  return children;
}
