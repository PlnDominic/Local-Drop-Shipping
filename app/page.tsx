'use client';

import { useRouter } from 'next/navigation';
import { Navigation } from '../components/Navigation';
import { LandingPage } from '../views/LandingPage';

export default function Page() {
  const router = useRouter();

  return (
    <>
      <Navigation />
      <LandingPage
        onJoinAsDropshipper={() => router.push('/dropshipper')}
        onBrowseMarketplace={() => router.push('/marketplace')}
      />
    </>
  );
}
