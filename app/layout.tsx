import type { Metadata } from 'next';
import './globals.css';
import { ToastContainer } from '../components/Toast';
import { AuthProvider } from '../lib/auth/AuthProvider';
import { HydrationGate } from '../components/HydrationGate';

const heroImage = 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1800&q=90';

export const metadata: Metadata = {
  title: 'Local Drop Shipping GH - Sell More. Stock Less. Grow Faster.',
  description: 'Local Drop Shipping GH — Ghana\'s local dropshipping storefront and operations platform. Connect with verified suppliers, import products in seconds, and earn commissions via MTN MoMo.',
  keywords: ['dropshipping Ghana', 'Ghana online business', 'MTN MoMo business', 'local suppliers Accra', 'dropshipping platform', 'GhanaPost GPS delivery', 'wholesale Ghana', 'Kumasi suppliers'],
  robots: 'index, follow',
  openGraph: {
    title: 'Local Drop Shipping GH - Sell More. Stock Less. Grow Faster.',
    description: 'Ghana\'s #1 local dropshipping platform. Connect with verified suppliers in Accra, Kumasi & Tema. Earn commissions via MTN MoMo.',
    type: 'website',
    images: [
      {
        url: heroImage,
        width: 1800,
        alt: 'Local Drop Shipping GH - Ghana Dropshipping Platform'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Local Drop Shipping GH - Sell More. Stock Less. Grow Faster.',
    description: 'Ghana\'s #1 local dropshipping platform. Earn commissions via MTN MoMo with verified local suppliers.',
    images: [heroImage]
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-neutral-light text-neutral-dark font-sans antialiased">
        <AuthProvider>
          <HydrationGate />
          {children}
          <ToastContainer />
        </AuthProvider>
      </body>
    </html>
  );
}
