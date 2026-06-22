import React from 'react';
import { Navigation } from '../../components/Navigation';

export default function AppLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Navigation />
      {children}
    </>
  );
}
