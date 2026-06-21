import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Local Drop Shipping GH - Sell More. Stock Less. Grow Faster.',
  description: 'Local Drop Shipping GH — Ghana\'s local dropshipping storefront and operations platform.'
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
      <body className="bg-neutral-light text-neutral-dark font-sans antialiased">{children}</body>
    </html>
  );
}
