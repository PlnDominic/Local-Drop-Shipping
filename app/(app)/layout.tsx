import React from 'react';
import { SiteHeader } from '../../components/SiteHeader';

export default function AppLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <SiteHeader />
      {children}
    </>
  );
}
